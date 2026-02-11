import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comment_votes_create } from "../../../generate/generate_random_reddit_platform_member_comment_votes_create";
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_member_comment_vote_revocation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a post using member-specific connection
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        communityId: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "TEXT" as const,
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment =
    await api.functional.redditPlatform.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Create initial DOWNVOTE on the comment
  const initialVote =
    await api.functional.redditPlatform.member.comment_votes.create(
      memberConnection,
      {
        body: {
          comment_id: comment.id,
          vote_type: "downvote" as const,
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(initialVote);
  // Verify vote was created with correct type
  TestValidator.equals(
    "vote type is downvote",
    initialVote.vote_type,
    "DOWNVOTE",
  );
  // Store original score for comparison after revocation
  const originalScore = initialVote.vote_score + 1; // Downvote decreases by 1
  // 5. Update vote to NONE (revocation)
  const updatedVote =
    await api.functional.redditPlatform.member.posts.comments.votes.updateVote(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "NONE" as const,
        } satisfies IRedditPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // 6. Verify vote revocation
  TestValidator.equals(
    "vote type is NONE after revocation",
    updatedVote.vote_type,
    "NONE",
  );
  TestValidator.equals(
    "comment score reverted to original",
    originalScore,
    updatedVote.vote_score,
  );
  // Verify vote record exists with NONE type
  TestValidator.equals(
    "vote record has correct member",
    updatedVote.member.id,
    member.id,
  );
  TestValidator.equals(
    "vote record has correct comment",
    updatedVote.comment.id,
    comment.id,
  );
}
