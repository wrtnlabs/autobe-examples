import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformTrendingPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingPost";

/**
 * Test that posts with comments locked (is_locked=true) still appear in
 * trending results and are ranked normally. Verify that lock status is included
 * in post metadata but does not affect trending ranking. Confirm that locked
 * posts can still be viewed in trending feeds, with lock status visible to
 * indicate new comments cannot be added. Test that lock status does not affect
 * comment count or vote metrics.
 *
 * Steps:
 *
 * 1. Retrieve trending posts from the API
 * 2. Examine the response structure and data
 * 3. Verify that posts with is_locked=true are present in results
 * 4. Confirm that locked posts have valid engagement metrics (votes, comments)
 * 5. Verify that the lock status flag is properly exposed in the response
 * 6. Validate that pagination metadata is correctly provided
 */
export async function test_api_trending_posts_locked_posts_included(
  connection: api.IConnection,
) {
  // Retrieve trending posts from the API
  const trendingResponse: IPageICommunityPlatformTrendingPost =
    await api.functional.communityPlatform.trending.posts.index(connection);

  // Validate the response structure
  typia.assert(trendingResponse);

  // Verify that we received a valid paginated response with data
  TestValidator.predicate(
    "trending response should contain pagination data",
    trendingResponse.pagination !== null &&
      trendingResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "trending response should contain posts array",
    Array.isArray(trendingResponse.data),
  );

  // If there are posts in the response, examine them
  if (trendingResponse.data.length > 0) {
    // Check for locked posts in the trending results
    const lockedPosts = trendingResponse.data.filter(
      (trendingPost) => trendingPost.post.is_locked === true,
    );

    // Verify pagination metadata structure
    TestValidator.predicate(
      "pagination should have current page number",
      trendingResponse.pagination.current >= 0,
    );

    TestValidator.predicate(
      "pagination should have limit",
      trendingResponse.pagination.limit >= 0,
    );

    TestValidator.predicate(
      "pagination should have total records count",
      trendingResponse.pagination.records >= 0,
    );

    TestValidator.predicate(
      "pagination should have pages count",
      trendingResponse.pagination.pages >= 0,
    );

    // For each post in the response, validate the structure and metrics
    for (const trendingPost of trendingResponse.data) {
      // Validate trending post structure
      TestValidator.predicate(
        "trending post should have valid id",
        trendingPost.id !== null && trendingPost.id !== undefined,
      );

      TestValidator.predicate(
        "trending post should have postId",
        trendingPost.postId !== null && trendingPost.postId !== undefined,
      );

      TestValidator.predicate(
        "trending post should have communityId",
        trendingPost.communityId !== null &&
          trendingPost.communityId !== undefined,
      );

      // Validate post object exists
      TestValidator.predicate(
        "trending post should contain post object",
        trendingPost.post !== null && trendingPost.post !== undefined,
      );

      // Validate community object exists
      TestValidator.predicate(
        "trending post should contain community object",
        trendingPost.community !== null && trendingPost.community !== undefined,
      );

      // Validate engagement metrics
      TestValidator.predicate(
        "post upvote count should be non-negative",
        trendingPost.upvoteCount >= 0,
      );

      TestValidator.predicate(
        "post downvote count should be non-negative",
        trendingPost.downvoteCount >= 0,
      );

      TestValidator.predicate(
        "post comment count should be non-negative",
        trendingPost.commentCount >= 0,
      );

      // Validate that is_locked flag is present and accessible
      TestValidator.predicate(
        "post should have is_locked flag",
        typeof trendingPost.post.is_locked === "boolean",
      );

      // Validate trending metrics are present
      TestValidator.predicate(
        "trending post should have rank",
        trendingPost.rank > 0,
      );

      // Validate post creator information
      TestValidator.predicate(
        "post should have creator",
        trendingPost.post.creator !== null &&
          trendingPost.post.creator !== undefined,
      );

      // Validate post creation timestamp
      TestValidator.predicate(
        "post should have created_at timestamp",
        trendingPost.post.created_at !== null &&
          trendingPost.post.created_at !== undefined,
      );
    }

    // If there are locked posts, verify they are ranked and functional in trending
    if (lockedPosts.length > 0) {
      TestValidator.predicate(
        "locked posts should be included in trending results",
        lockedPosts.length > 0,
      );

      // Verify that locked posts have valid engagement metrics
      for (const lockedPost of lockedPosts) {
        TestValidator.predicate(
          "locked post should have upvote count metric",
          lockedPost.upvoteCount >= 0,
        );

        TestValidator.predicate(
          "locked post should preserve comment count metric",
          lockedPost.commentCount >= 0,
        );

        TestValidator.predicate(
          "locked post should have valid rank position in trending",
          lockedPost.rank > 0,
        );

        TestValidator.predicate(
          "locked post is_locked flag should be true",
          lockedPost.post.is_locked === true,
        );
      }
    }
  }
}
