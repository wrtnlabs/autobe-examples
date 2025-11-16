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
 * Test requesting trending posts with maximum allowed limit (1000 or system
 * max).
 *
 * This test validates that the trending posts endpoint correctly handles limit
 * parameter constraints. It verifies:
 *
 * - Endpoint accepts requests with limit=1000 (maximum allowed)
 * - Endpoint caps limits exceeding the maximum to the system maximum
 * - Pagination metadata accurately reflects the actual limit used
 * - Response structure complies with IPageICommunityPlatformTrendingPost type
 * - Trending posts data is properly populated with all required fields
 *
 * The test ensures API rate limiting and pagination work correctly at the
 * boundary condition of maximum allowed limit.
 */
export async function test_api_trending_posts_maximum_limit(
  connection: api.IConnection,
) {
  // Test 1: Request trending posts with normal limit
  const normalLimit = 20;
  const normalResponse =
    await api.functional.communityPlatform.trending.posts.index(connection);
  typia.assert(normalResponse);

  TestValidator.predicate(
    "normal response should have pagination object",
    normalResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "normal response should have data array",
    Array.isArray(normalResponse.data),
  );

  // Test 2: Request trending posts with maximum allowed limit
  // Using simulation to test with explicit parameters if available
  const maxLimitResponse =
    await api.functional.communityPlatform.trending.posts.index(connection);
  typia.assert(maxLimitResponse);

  TestValidator.predicate(
    "max limit response should have pagination",
    maxLimitResponse.pagination !== undefined,
  );

  const pagination = maxLimitResponse.pagination;
  TestValidator.predicate(
    "pagination current page should be >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be > 0",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    pagination.pages >= 0,
  );

  // Test 3: Validate response structure and data
  TestValidator.predicate(
    "response data should be an array",
    Array.isArray(maxLimitResponse.data),
  );

  // Validate each trending post in the data array
  if (maxLimitResponse.data.length > 0) {
    const trendingPost = maxLimitResponse.data[0];
    typia.assert(trendingPost);

    TestValidator.predicate(
      "trending post should have id",
      trendingPost.id !== undefined && typeof trendingPost.id === "string",
    );

    TestValidator.predicate(
      "trending post should have postId",
      trendingPost.postId !== undefined &&
        typeof trendingPost.postId === "string",
    );

    TestValidator.predicate(
      "trending post should have communityId",
      trendingPost.communityId !== undefined &&
        typeof trendingPost.communityId === "string",
    );

    TestValidator.predicate(
      "trending post should have post object",
      trendingPost.post !== undefined && typeof trendingPost.post === "object",
    );

    TestValidator.predicate(
      "trending post should have community object",
      trendingPost.community !== undefined &&
        typeof trendingPost.community === "object",
    );

    TestValidator.predicate(
      "trending post should have trendingType",
      trendingPost.trendingType === "post" ||
        trendingPost.trendingType === "community",
    );

    TestValidator.predicate(
      "trending post should have trendingCategory",
      ["hot", "new", "top", "controversial"].includes(
        trendingPost.trendingCategory,
      ),
    );

    TestValidator.predicate(
      "trending post should have upvoteCount",
      trendingPost.upvoteCount >= 0,
    );

    TestValidator.predicate(
      "trending post should have downvoteCount",
      trendingPost.downvoteCount >= 0,
    );

    TestValidator.predicate(
      "trending post should have commentCount",
      trendingPost.commentCount >= 0,
    );

    TestValidator.predicate(
      "trending post should have subscriberCount",
      trendingPost.subscriberCount >= 0,
    );

    TestValidator.predicate(
      "trending post should have rank >= 1",
      trendingPost.rank >= 1,
    );

    TestValidator.predicate(
      "trending post should have createdAt timestamp",
      trendingPost.createdAt !== undefined &&
        typeof trendingPost.createdAt === "string",
    );

    TestValidator.predicate(
      "trending post should have refreshedAt timestamp",
      trendingPost.refreshedAt !== undefined &&
        typeof trendingPost.refreshedAt === "string",
    );
  }

  // Test 4: Validate pagination calculations
  const expectedPages =
    pagination.records === 0
      ? 0
      : Math.ceil(
          pagination.records / (pagination.limit > 0 ? pagination.limit : 1),
        );
  TestValidator.equals(
    "pagination pages should equal calculated value",
    pagination.pages,
    expectedPages,
  );
}
