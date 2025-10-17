import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostMetrics";

/**
 * Test that post metrics accurately track comment count.
 *
 * This test validates the materialized view system's ability to aggregate
 * comment data from the reddit_like_comments table. It creates a complete
 * workflow: member registration, community creation, post creation, and comment
 * addition. After adding a single comment, the test retrieves post metrics and
 * verifies that comment_count equals 1 while all vote metrics remain at zero,
 * confirming proper metric calculation without voting activity.
 */
export async function test_api_post_metrics_with_comment_count(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new member
  const memberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create a community for hosting the post
  const communityData = {
    code: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<25> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
    description: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<500>
    >(),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a post in the community
  const postData = {
    community_id: community.id,
    type: "text",
    title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
    body: typia.random<string & tags.MaxLength<40000>>(),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Add a comment to the post
  const commentData = {
    reddit_like_post_id: post.id,
    content_text: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<10000>
    >(),
  } satisfies IRedditLikeComment.ICreate;

  const comment: IRedditLikeComment =
    await api.functional.redditLike.member.comments.create(connection, {
      body: commentData,
    });
  typia.assert(comment);

  // Step 5: Retrieve post metrics and validate comment count
  const metrics: IRedditLikePostMetrics =
    await api.functional.redditLike.posts.metrics.at(connection, {
      postId: post.id,
    });
  typia.assert(metrics);

  // Validate that comment_count is 1
  TestValidator.equals("comment count should be 1", metrics.comment_count, 1);

  // Validate that vote metrics remain at zero
  TestValidator.equals("vote score should be 0", metrics.vote_score, 0);
  TestValidator.equals("upvote count should be 0", metrics.upvote_count, 0);
  TestValidator.equals("downvote count should be 0", metrics.downvote_count, 0);
}
