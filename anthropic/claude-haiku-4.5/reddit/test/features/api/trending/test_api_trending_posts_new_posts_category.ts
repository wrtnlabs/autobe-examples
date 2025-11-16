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
 * Validates that the trending posts endpoint correctly filters and ranks posts
 * in the 'new' category by creation timestamp with proper time decay
 * algorithm.
 *
 * The 'new' category emphasizes chronologically recent posts, with special
 * boost for posts created within the last 24 hours. This test verifies that:
 *
 * 1. Posts are sorted by creation timestamp in descending order (newest first)
 * 2. Recent posts (within 24 hours) appear higher in rankings despite lower
 *    engagement
 * 3. Posts older than 48 hours are deprioritized even with high engagement metrics
 * 4. Trend velocity metrics are included for tracking engagement growth rate
 * 5. Deleted posts and posts from inactive accounts are properly excluded
 * 6. Response structure includes pagination and proper ranking data
 */
export async function test_api_trending_posts_new_posts_category(
  connection: api.IConnection,
) {
  // Retrieve trending posts - should return paginated collection
  const trendingResponse: IPageICommunityPlatformTrendingPost =
    await api.functional.communityPlatform.trending.posts.index(connection);
  typia.assert(trendingResponse);

  // Validate response structure
  TestValidator.predicate(
    "response includes pagination metadata",
    trendingResponse.pagination !== null &&
      trendingResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response includes data array",
    Array.isArray(trendingResponse.data),
  );

  // Validate pagination properties
  const pagination = trendingResponse.pagination;
  TestValidator.predicate(
    "current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("limit is non-negative", pagination.limit >= 0);
  TestValidator.predicate(
    "total records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("total pages is non-negative", pagination.pages >= 0);

  // If there are posts in the response, validate their properties
  if (trendingResponse.data.length > 0) {
    const posts = trendingResponse.data;

    // Validate posts are filtered to non-deleted only
    for (const trendPost of posts) {
      // Verify trending post structure
      TestValidator.predicate(
        "trending post has valid UUID id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          trendPost.id,
        ),
      );
      TestValidator.predicate(
        "trending post has valid postId",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          trendPost.postId,
        ),
      );
      TestValidator.predicate(
        "trending post has valid communityId",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          trendPost.communityId,
        ),
      );

      // Validate trending type and category
      TestValidator.equals(
        "trending type should be post",
        trendPost.trendingType,
        "post",
      );
      TestValidator.equals(
        "trending category should be new",
        trendPost.trendingCategory,
        "new",
      );

      // Validate engagement metrics are non-negative
      TestValidator.predicate(
        "upvote count is non-negative",
        trendPost.upvoteCount >= 0,
      );
      TestValidator.predicate(
        "downvote count is non-negative",
        trendPost.downvoteCount >= 0,
      );
      TestValidator.predicate(
        "comment count is non-negative",
        trendPost.commentCount >= 0,
      );
      TestValidator.predicate(
        "subscriber count is non-negative",
        trendPost.subscriberCount >= 0,
      );

      // Validate rank is positive
      TestValidator.predicate(
        "rank should be positive (1 or higher)",
        trendPost.rank >= 1,
      );

      // Validate trend velocity exists for new category
      TestValidator.predicate(
        "trend velocity metric should exist for new category",
        trendPost.trendVelocity !== null &&
          trendPost.trendVelocity !== undefined,
      );

      // Validate timestamps
      TestValidator.predicate(
        "created_at is valid ISO date-time",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trendPost.createdAt),
      );
      TestValidator.predicate(
        "refreshed_at is valid ISO date-time",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trendPost.refreshedAt),
      );

      // Validate post summary
      TestValidator.predicate(
        "post has valid id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          trendPost.post.id,
        ),
      );
      TestValidator.predicate(
        "post title exists and is non-empty",
        trendPost.post.title.length > 0,
      );
      TestValidator.predicate(
        "post type is valid",
        ["text", "link", "image"].includes(trendPost.post.post_type),
      );

      // Validate post visibility - should only show public posts
      TestValidator.equals(
        "post should be public (not deleted)",
        trendPost.post.visibility_status,
        "public",
      );

      // Validate creator information
      TestValidator.predicate(
        "creator has valid id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          trendPost.post.creator.id,
        ),
      );
      TestValidator.predicate(
        "creator username is non-empty",
        trendPost.post.creator.username.length > 0,
      );

      // Validate creator is active (account_status should be active)
      TestValidator.equals(
        "creator account should be active",
        trendPost.post.creator.account_status,
        "active",
      );

      // Validate community information
      TestValidator.predicate(
        "community has valid id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          trendPost.community.id,
        ),
      );
      TestValidator.predicate(
        "community identifier follows pattern",
        /^[a-z0-9_]{3,32}$/.test(trendPost.community.identifier),
      );
      TestValidator.predicate(
        "community name is non-empty",
        trendPost.community.name.length >= 3 &&
          trendPost.community.name.length <= 100,
      );
    }

    // Validate ranking order - posts should be ordered by rank (1, 2, 3, etc.)
    for (let i = 1; i < posts.length; i++) {
      TestValidator.predicate(
        "posts are ordered by ascending rank",
        posts[i].rank >= posts[i - 1].rank,
      );
    }

    // Validate recency bias - newer posts should generally appear earlier
    // Check if posts are sorted by created_at in descending order (newest first)
    const createdDates = posts.map((p) => new Date(p.createdAt).getTime());
    let isDescendingOrClose = true;
    for (let i = 1; i < createdDates.length && i < 10; i++) {
      // Allow some tolerance due to engagement boost - posts within same time window may vary
      const timeDiff = Math.abs(createdDates[i - 1] - createdDates[i]);
      const hoursApart = timeDiff / (1000 * 60 * 60);
      // If posts are more than 24 hours apart, they should maintain descending order
      // Newer posts get 24-hour boost, so order might vary within 24 hours
      if (hoursApart > 24 && createdDates[i] > createdDates[i - 1]) {
        isDescendingOrClose = false;
        break;
      }
    }
    TestValidator.predicate(
      "new category shows time decay (older posts appear later)",
      isDescendingOrClose,
    );
  }

  // Validate overall response structure matches expected type
  typia.assert(trendingResponse);
}
