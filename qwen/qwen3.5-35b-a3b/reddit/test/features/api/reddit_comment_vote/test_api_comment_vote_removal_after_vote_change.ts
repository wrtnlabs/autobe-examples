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

export async function test_api_comment_vote_removal_after_vote_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Update connection with member's auth token for subsequent calls
  memberConnection.headers = { Authorization: memberAuth.token.access };
  // 2. Member creates a post in a community
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text" as const,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Member creates a comment on that post
  const comment = await api.functional.redditPlatform.member.comments.create(
    memberConnection,
    {
      body: {
        reddit_platform_post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Member casts an initial upvote on the comment
  const upvote =
    await api.functional.redditPlatform.member.comments.vote.create(
      memberConnection,
      {
        commentId: comment.id,
        body: { vote_type: "up" as const },
      },
    );
  typia.assert(upvote);
  // 5. Member changes their vote from upvote to downvote
  const downvote =
    await api.functional.redditPlatform.member.comments.vote.create(
      memberConnection,
      {
        commentId: comment.id,
        body: { vote_type: "down" as const },
      },
    );
  typia.assert(downvote);
  // Verify initial state: score should be -1 (one downvote)
  TestValidator.equals("initial score", downvote.comment.score, -1);
  TestValidator.equals(
    "initial downvotes",
    downvote.comment.downvotes_count,
    1,
  );
  // 6. Perform DELETE to remove the vote
  await api.functional.redditPlatform.member.comments.vote.erase(
    memberConnection,
    {
      commentId: comment.id,
    },
  );
  // 7. After removal, create another vote to get the updated comment state
  // The response includes the comment with updated metrics
  const postRemovalVote =
    await api.functional.redditPlatform.member.comments.vote.create(
      memberConnection,
      {
        commentId: comment.id,
        body: { vote_type: "up" as const },
      },
    );
  typia.assert(postRemovalVote);
  // Verify metrics after vote removal (before new vote is cast)
  // Note: The API returns the comment with vote counts updated after removal
  TestValidator.equals(
    "upvotes after removal (before new vote)",
    postRemovalVote.comment.upvotes_count,
    0,
  );
  TestValidator.equals(
    "downvotes after removal (before new vote)",
    postRemovalVote.comment.downvotes_count,
    0,
  );
  TestValidator.equals(
    "score after removal (before new vote)",
    postRemovalVote.comment.score,
    0,
  );
  // 8. Verify the vote record's vote_type is now NULL (removed)
  typia.assert(postRemovalVote);
  const voteType: string | null = postRemovalVote.vote_type;
  TestValidator.equals("vote type after removal", voteType, null);
  // 9. Verify updated_at reflects the removal time (more recent than downvote)
  const downvoteUpdatedAt = new Date(downvote.updated_at).getTime();
  const removalUpdatedAt = new Date(postRemovalVote.updated_at).getTime();
  TestValidator.predicate(
    "updated_at reflects removal",
    removalUpdatedAt > downvoteUpdatedAt,
  );
  // 10. Verify comment metrics are consistent
  TestValidator.notEquals(
    "score changed after removal",
    downvote.comment.score,
    postRemovalVote.comment.score,
  );
}
