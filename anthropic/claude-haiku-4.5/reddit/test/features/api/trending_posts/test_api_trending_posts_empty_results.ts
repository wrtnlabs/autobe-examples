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
 * Test edge case when no trending posts are available.
 *
 * This test validates the endpoint behavior when the database contains no
 * posts, posts from inactive communities, or all posts have been removed. The
 * endpoint should return a successful response with an empty data array and
 * valid pagination metadata showing 0 total records, 0 pages, and appropriate
 * pagination properties.
 *
 * Steps:
 *
 * 1. Request trending posts from the endpoint with no data in the system
 * 2. Verify the response has successful HTTP status
 * 3. Validate pagination metadata shows 0 records and 0 pages
 * 4. Confirm data array is empty
 * 5. Verify response structure is valid and properly typed
 * 6. Ensure all pagination properties have correct values for empty state
 */
export async function test_api_trending_posts_empty_results(
  connection: api.IConnection,
) {
  // Call the trending posts endpoint
  const response: IPageICommunityPlatformTrendingPost =
    await api.functional.communityPlatform.trending.posts.index(connection);

  // Validate the response structure
  typia.assert(response);

  // Verify pagination metadata
  const pagination = response.pagination;
  TestValidator.equals("pagination current should be 0", pagination.current, 0);
  TestValidator.equals("pagination records should be 0", pagination.records, 0);
  TestValidator.equals("pagination pages should be 0", pagination.pages, 0);
  TestValidator.predicate(
    "pagination limit should be non-negative",
    pagination.limit >= 0,
  );

  // Verify data array is empty
  TestValidator.equals("data array should be empty", response.data.length, 0);
  TestValidator.predicate(
    "data should be an empty array",
    Array.isArray(response.data),
  );

  // Verify the response structure is complete and valid
  TestValidator.predicate(
    "response should have pagination object",
    !!response.pagination,
  );
  TestValidator.predicate(
    "response should have data array",
    Array.isArray(response.data),
  );
}
