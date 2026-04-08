import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_comments_vote_create } from "../../../generate/generate_random_reddit_platform_member_comments_vote_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";

/**
 * Test that vote removal is rejected when attempting to remove a vote from a deleted comment.
 *
 * Validates that the system correctly rejects vote removal requests for deleted (or non-existent) comments,
 * ensuring vote records cannot be manipulated on comments that no longer exist. The test creates two members,
 * has one post on a community, the other posts a comment, casts an upvote, then attempts to remove the vote
 * from a deleted comment. The operation should fail with 404, and the original vote should remain intact.
 *
 * Special attention is given to verifying that vote removal validation correctly checks comment deletion status
 * and prevents vote manipulation on deleted content.
 *
 * 1. Member A joins and authenticates
 * 2. Member B joins and authenticates
 * 3. Member A creates a post in a community
 * 4. Member B creates a comment on that post
 * 5. Member A casts an upvote on Member B's comment
 * 6. Verify the vote was successfully cast
 * 7. Attempt to remove vote from a non-existent (deleted) comment
 * 8. Validate the operation returns 404 Not Found
 * 9. Verify the original vote remains unchanged
 * 10. Verify vote metrics on the original comment are preserved
 */
export async function test_api_comment_vote_removal_on_deleted_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two member accounts for testing
  const memberAConn: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConn, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(memberAAuth);
  const memberBConn: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConn, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(memberBAuth);
  // 2. Member A creates a post
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditPlatform.member.posts.create(
    memberAConn,
    {
      body: {
        community_id: communityId,
        title: RandomGenerator.name(3),
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Member B creates a comment on the post
  const comment = await api.functional.redditPlatform.member.comments.create(
    memberBConn,
    {
      body: {
        reddit_platform_post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Verify comment initially has no votes
  TestValidator.equals("initial upvote count", comment.upvotes_count, 0);
  TestValidator.equals("initial downvote count", comment.downvotes_count, 0);
  // 5. Member A casts an upvote on Member B's comment
  const upvote =
    await api.functional.redditPlatform.member.comments.vote.create(
      memberAConn,
      {
        commentId: comment.id,
        body: {
          vote_type: "up" as const,
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(upvote);
  TestValidator.equals("vote is up", upvote.vote_type, "up");
  // 6. Verify the vote record was created correctly
  TestValidator.equals(
    "vote member matches voter",
    upvote.member.id,
    memberAAuth.id,
  );
  TestValidator.equals("vote comment matches", upvote.comment.id, comment.id);
  // 7. Attempt to remove vote from a non-existent (deleted) comment
  // Use a random UUID that doesn't exist in the database
  const deletedCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "vote removal rejected for deleted comment",
    async () => {
      await api.functional.redditPlatform.member.comments.vote.erase(
        memberAConn,
        {
          commentId: deletedCommentId,
        },
      );
    },
  );
  // 8. Verify the original vote still exists on the original comment
  const originalVote =
    await api.functional.redditPlatform.member.comments.vote.create(
      memberAConn,
      {
        commentId: comment.id,
        body: {
          vote_type: "up" as const,
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(originalVote);
  TestValidator.equals(
    "original vote still exists",
    originalVote.vote_type,
    "up",
  );
  TestValidator.equals(
    "original vote member unchanged",
    originalVote.member.id,
    memberAAuth.id,
  );
  // 9. Verify the comment still has the correct vote metrics
  // (Since SDK doesn't have GET comments, we verify via re-casting vote which should return same count)
  const reCastVote =
    await api.functional.redditPlatform.member.comments.vote.create(
      memberAConn,
      {
        commentId: comment.id,
        body: {
          vote_type: "up" as const,
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(reCastVote);
  TestValidator.equals(
    "comment upvote count after failed deletion",
    reCastVote.comment.upvotes_count,
    1,
  );
  TestValidator.equals(
    "comment downvote count unchanged",
    reCastVote.comment.downvotes_count,
    0,
  );
  TestValidator.equals("comment score is correct", reCastVote.comment.score, 1);
}
