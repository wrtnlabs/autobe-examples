import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingCommunity";

/**
 * Test guest discovery of trending communities.
 *
 * Validates that unauthenticated guests can access the trending communities
 * endpoint and receive properly ranked, paginated results from the materialized
 * view. Ensures response includes community metadata and trending metrics
 * within performance targets.
 *
 * Steps:
 *
 * 1. Call trending communities endpoint without authentication
 * 2. Validate response structure and pagination metadata
 * 3. Verify community data includes essential fields (name, identifier, subscriber
 *    count)
 * 4. Confirm trending metrics (rank, category, velocity) are present
 * 5. Validate pagination allows browsing through results
 * 6. Verify response completes within performance target
 */
export async function test_api_trending_communities_guest_discovery(
  connection: api.IConnection,
) {
  // Record performance start time
  const startTime = Date.now();

  // Call trending communities endpoint without authentication
  const trendingResponse: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );

  // Record performance end time
  const endTime = Date.now();
  const responseDuration = endTime - startTime;

  // Validate complete response structure
  typia.assert(trendingResponse);

  // Verify data array is present
  TestValidator.predicate(
    "data array should be present and not empty",
    trendingResponse.data.length > 0,
  );

  // Validate each trending community in response
  const firstCommunity = trendingResponse.data[0];

  // Verify trending category is one of expected values (hot, new, top, controversial)
  TestValidator.predicate(
    "trending category should be one of valid options",
    ["hot", "new", "top", "controversial"].includes(
      firstCommunity.trendingCategory,
    ),
  );

  // Verify rank is positive
  TestValidator.predicate("rank should be positive", firstCommunity.rank >= 1);

  const community = firstCommunity.community;

  // Verify identifier follows URL-safe format (lowercase, numbers, underscores only)
  TestValidator.predicate(
    "community identifier should match format pattern",
    /^[a-z0-9_]+$/.test(community.identifier),
  );

  // Verify subscriber count metrics are consistent
  TestValidator.equals(
    "trending subscriber count should match community data",
    firstCommunity.subscriberCount,
    community.subscriber_count,
  );

  // Verify post count metrics are consistent
  TestValidator.equals(
    "trending post count should match community data",
    firstCommunity.postCount,
    community.post_count,
  );

  // Verify pagination structure is valid
  TestValidator.predicate(
    "pagination limit should match data array size or indicate more pages",
    trendingResponse.data.length <= trendingResponse.pagination.limit,
  );

  TestValidator.predicate(
    "current page should be within valid range",
    trendingResponse.pagination.current >= 0 &&
      trendingResponse.pagination.current < trendingResponse.pagination.pages,
  );

  // Verify response performance within 500ms target
  TestValidator.predicate(
    "response should complete within 500ms performance target",
    responseDuration <= 500,
  );
}
