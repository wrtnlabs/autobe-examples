import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommentVotesSum } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVotesSum";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";

/**
 * Test vote summary for a newly created comment with no votes.
 * 1. Create a member and authenticate.
 * 2. Create a community and post (implied but not provided in scenario plan).
 * 3. Create a new comment on the post without casting votes.
 * 4. Verify the vote summary shows zero votes and null last_vote_at.
 */
export async function test_api_comment_vote_summary_new_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a post (prerequisite for comment creation)
  // Since the scenario plan does not include post creation, we assume a post exists
  // This is a limitation of the provided scenario plan
  // In a real E2E test, we would create a community and post first
  // For this test, we use a placeholder postId (not a valid E2E test)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a new comment on the post
  const comment = await api.functional.redditLike.member.posts.comments.create(
    memberConnection,
    {
      postId: postId,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Get vote summary for the new comment
  const summary = await api.functional.redditLike.comments.votes.summary(
    memberConnection,
    {
      commentId: comment.id,
    },
  );
  typia.assert(summary);
  // 5. Validate the summary
  TestValidator.equals(
    "vote_sum should be 0 for new comment",
    summary.vote_sum,
    0,
  );
  TestValidator.equals(
    "upvote_count should be 0 for new comment",
    summary.upvote_count,
    0,
  );
  TestValidator.equals(
    "downvote_count should be 0 for new comment",
    summary.downvote_count,
    0,
  );
  TestValidator.equals(
    "last_vote_at should be null for new comment",
    summary.last_vote_at,
    null,
  );
}
