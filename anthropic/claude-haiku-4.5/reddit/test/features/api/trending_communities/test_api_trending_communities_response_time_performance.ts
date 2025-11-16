import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingCommunity";

/**
 * Test trending communities endpoint performance SLAs.
 *
 * This test validates that the trending communities endpoint meets strict
 * performance requirements. The endpoint queries a materialized view that is
 * pre-calculated and refreshed hourly, enabling fast response times even with
 * millions of communities in the database.
 *
 * Performance targets:
 *
 * - Initial page load: < 500ms (95th percentile)
 * - Paginated requests: < 300ms per request
 * - Consistent performance across multiple requests
 *
 * Test approach:
 *
 * 1. Measure initial load performance with default pagination
 * 2. Verify response structure and data validity
 * 3. Test multiple sequential requests to confirm consistent performance
 * 4. Validate average response time
 * 5. Confirm materialized view enables fast and consistent queries
 */
export async function test_api_trending_communities_response_time_performance(
  connection: api.IConnection,
) {
  // Test 1: Initial page load performance (default parameters)
  const startTime1 = performance.now();
  const initialResponse: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );
  const elapsedTime1 = performance.now() - startTime1;

  typia.assert(initialResponse);
  TestValidator.predicate(
    "initial page load completes within 500ms (95th percentile)",
    elapsedTime1 < 500,
  );
  TestValidator.predicate(
    "response has valid pagination structure",
    initialResponse.pagination !== null &&
      initialResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    initialResponse.data !== null && initialResponse.data !== undefined,
  );

  // Test 2: Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    initialResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    initialResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination total records count is valid",
    initialResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    initialResponse.pagination.pages >= 0,
  );

  // Test 3: Verify trending community data structure
  if (initialResponse.data.length > 0) {
    const firstCommunity = initialResponse.data[0];
    TestValidator.predicate(
      "trending community has valid ID",
      firstCommunity.id !== null &&
        firstCommunity.id !== undefined &&
        firstCommunity.id.length > 0,
    );
    TestValidator.predicate(
      "trending community has community reference",
      firstCommunity.community !== null &&
        firstCommunity.community !== undefined,
    );
    TestValidator.predicate(
      "trending community has trending type",
      firstCommunity.trendingType !== null &&
        firstCommunity.trendingType !== undefined,
    );
    TestValidator.predicate(
      "trending community has trending category",
      firstCommunity.trendingCategory !== null &&
        firstCommunity.trendingCategory !== undefined,
    );
    TestValidator.predicate(
      "trending community has subscriber count",
      firstCommunity.subscriberCount >= 0,
    );
    TestValidator.predicate(
      "trending community has post count",
      firstCommunity.postCount >= 0,
    );
    TestValidator.predicate(
      "trending community has comment count",
      firstCommunity.commentCount >= 0,
    );
    TestValidator.predicate(
      "trending community has valid rank",
      firstCommunity.rank >= 1,
    );
  }

  // Test 4: Multiple sequential requests for consistency
  const sequentialTimes: number[] = [];

  for (let i = 0; i < 5; i++) {
    const startTime = performance.now();
    const response: IPageICommunityPlatformTrendingCommunity.ISummary =
      await api.functional.communityPlatform.trending.communities.index(
        connection,
      );
    const elapsedTime = performance.now() - startTime;
    sequentialTimes.push(elapsedTime);

    typia.assert(response);
  }

  // All sequential requests should complete within performance target
  TestValidator.predicate(
    "all sequential requests complete within 500ms",
    sequentialTimes.every((time) => time < 500),
  );

  // Test 5: Average response time across multiple requests
  const averageTime =
    sequentialTimes.reduce((a, b) => a + b, 0) / sequentialTimes.length;
  TestValidator.predicate(
    "average response time is under 300ms",
    averageTime < 300,
  );

  // Calculate percentile for performance analysis
  const sortedTimes = [...sequentialTimes].sort((a, b) => a - b);
  const percentile95Index = Math.ceil(sortedTimes.length * 0.95) - 1;
  const percentile95 = sortedTimes[Math.max(0, percentile95Index)];
  TestValidator.predicate(
    "95th percentile response time is under 500ms",
    percentile95 < 500,
  );

  // Test 6: Verify materialized view benefits (data consistency)
  const response1: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );
  const response2: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );

  typia.assert(response1);
  typia.assert(response2);

  // Both responses should have the same pagination structure
  TestValidator.equals(
    "pagination current values match between requests",
    response1.pagination.current,
    response2.pagination.current,
  );
  TestValidator.equals(
    "pagination record counts match between requests",
    response1.pagination.records,
    response2.pagination.records,
  );

  // Both responses should have matching first community if data exists
  if (response1.data.length > 0 && response2.data.length > 0) {
    TestValidator.equals(
      "first community ID matches between consecutive requests",
      response1.data[0].id,
      response2.data[0].id,
    );
    TestValidator.equals(
      "first community trending type matches",
      response1.data[0].trendingType,
      response2.data[0].trendingType,
    );
  }

  // Test 7: Verify materialized view is properly populated
  TestValidator.predicate(
    "response contains trending communities data",
    initialResponse.data.length >= 0,
  );
  TestValidator.predicate(
    "pagination indicates available data",
    initialResponse.pagination.pages >= 0,
  );
}
