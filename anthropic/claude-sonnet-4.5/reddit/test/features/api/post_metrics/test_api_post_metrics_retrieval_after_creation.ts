import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostMetrics";

/**
 * Test retrieving engagement metrics for a newly created post.
 *
 * This test validates that when a post is first created, the metrics system
 * correctly initializes with zero engagement values. The workflow
 * demonstrates:
 *
 * 1. Member registration and authentication
 * 2. Community creation (required container for posts)
 * 3. Text post creation within the community
 * 4. Metrics retrieval for the newly created post
 * 5. Validation of initial zero-state metrics
 *
 * Business context: The metrics system maintains a materialized view of post
 * engagement statistics. This test ensures the view is properly initialized
 * when posts are created, preventing null/undefined errors in ranking
 * algorithms.
 */
export async function test_api_post_metrics_retrieval_after_creation(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert<IRedditLikeMember.IAuthorized>(member);

  // Step 2: Create a community to host the post
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const communityName = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<25>
  >();
  const communityDescription = typia.random<
    string & tags.MinLength<10> & tags.MaxLength<500>
  >();

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert<IRedditLikeCommunity>(community);

  // Step 3: Create a text post in the community
  const postTitle = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<300>
  >();
  const postBody = typia.random<string & tags.MaxLength<40000>>();

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: postTitle,
      body: postBody,
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert<IRedditLikePost>(post);

  // Step 4: Retrieve metrics for the newly created post
  const metrics = await api.functional.redditLike.posts.metrics.at(connection, {
    postId: post.id,
  });
  typia.assert<IRedditLikePostMetrics>(metrics);

  // Step 5: Validate initial metrics show zero engagement
  TestValidator.equals("vote score should be zero", metrics.vote_score, 0);
  TestValidator.equals("upvote count should be zero", metrics.upvote_count, 0);
  TestValidator.equals(
    "downvote count should be zero",
    metrics.downvote_count,
    0,
  );
  TestValidator.equals(
    "comment count should be zero",
    metrics.comment_count,
    0,
  );
  TestValidator.equals(
    "metrics should reference the created post",
    metrics.reddit_like_post_id,
    post.id,
  );
}
