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
 * Test that the trending posts endpoint meets performance SLAs for response
 * time.
 *
 * This test validates critical performance requirements for the trending posts
 * discovery mechanism:
 *
 * 1. **Initial Page Load Performance**: Verify that the first request to retrieve
 *    trending posts completes within 500ms (95th percentile), ensuring users
 *    experience responsive content discovery on initial page load.
 * 2. **Paginated Request Performance**: Confirm that subsequent paginated requests
 *    complete within 300ms (95th percentile), demonstrating optimized
 *    performance for users browsing through multiple pages of trending
 *    content.
 * 3. **Sequential Request Performance**: Test multiple sequential requests to
 *    confirm that performance remains consistent across multiple user
 *    interactions.
 * 4. **Concurrent Load Performance**: Validate that response times meet
 *    performance targets even under load when multiple concurrent requests are
 *    made, simulating real-world traffic patterns and ensuring the trending
 *    endpoint scales properly.
 *
 * The trending posts API uses materialized view caching refreshed hourly and
 * denormalized data to enable fast responses without expensive real-time
 * calculations, making these strict SLA targets achievable.
 */
export async function test_api_trending_posts_response_time_performance(
  connection: api.IConnection,
) {
  // Step 1: Test initial page load performance (500ms SLA for 95th percentile)
  const initialLoadTimes: number[] = [];
  const initialPageLoadCount = 20;

  for (let i = 0; i < initialPageLoadCount; i++) {
    const startTime = performance.now();
    const response: IPageICommunityPlatformTrendingPost =
      await api.functional.communityPlatform.trending.posts.index(connection);
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    initialLoadTimes.push(responseTime);

    typia.assert(response);
    TestValidator.predicate(
      "initial page response contains pagination and data",
      response.pagination !== undefined && response.data !== undefined,
    );
  }

  // Calculate 95th percentile for initial loads
  const sortedInitialTimes = initialLoadTimes.sort((a, b) => a - b);
  const initialP95Index = Math.floor(sortedInitialTimes.length * 0.95);
  const initialP95 = sortedInitialTimes[initialP95Index];
  TestValidator.predicate(
    "initial page load 95th percentile meets 500ms SLA",
    initialP95 <= 500,
  );

  // Step 2: Test paginated request performance (300ms SLA for 95th percentile)
  const paginatedLoadTimes: number[] = [];
  const paginatedRequestCount = 20;

  for (let i = 0; i < paginatedRequestCount; i++) {
    const startTime = performance.now();
    const response: IPageICommunityPlatformTrendingPost =
      await api.functional.communityPlatform.trending.posts.index(connection);
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    paginatedLoadTimes.push(responseTime);

    typia.assert(response);
  }

  // Calculate 95th percentile for paginated requests
  const sortedPaginatedTimes = paginatedLoadTimes.sort((a, b) => a - b);
  const paginatedP95Index = Math.floor(sortedPaginatedTimes.length * 0.95);
  const paginatedP95 = sortedPaginatedTimes[paginatedP95Index];
  TestValidator.predicate(
    "paginated request 95th percentile meets 300ms SLA",
    paginatedP95 <= 300,
  );

  // Step 3: Test sequential performance stability
  const sequentialLoadTimes: number[] = [];
  const sequentialRequestCount = 10;

  for (let i = 0; i < sequentialRequestCount; i++) {
    const startTime = performance.now();
    const response: IPageICommunityPlatformTrendingPost =
      await api.functional.communityPlatform.trending.posts.index(connection);
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    sequentialLoadTimes.push(responseTime);

    typia.assert(response);
    TestValidator.predicate(
      "sequential response contains valid data",
      response.pagination !== undefined && response.data !== undefined,
    );
  }

  // Verify sequential performance meets targets
  const sortedSequentialTimes = sequentialLoadTimes.sort((a, b) => a - b);
  const sequentialP95Index = Math.floor(sortedSequentialTimes.length * 0.95);
  const sequentialP95 = sortedSequentialTimes[sequentialP95Index];
  TestValidator.predicate(
    "sequential requests maintain acceptable response times",
    sequentialP95 <= 500,
  );

  // Step 4: Test concurrent load performance
  const concurrentRequestCount = 15;
  const concurrentLoadTimes: number[] = [];

  // Create concurrent requests and measure each response time
  const concurrentRequests = ArrayUtil.repeat(
    concurrentRequestCount,
    async () => {
      const startTime = performance.now();
      const response: IPageICommunityPlatformTrendingPost =
        await api.functional.communityPlatform.trending.posts.index(connection);
      const endTime = performance.now();
      concurrentLoadTimes.push(endTime - startTime);
      return response;
    },
  );

  // Execute all requests concurrently
  const concurrentResponses = await Promise.all(concurrentRequests);

  // Verify all concurrent responses are valid
  for (const response of concurrentResponses) {
    typia.assert(response);
    TestValidator.predicate(
      "concurrent response contains pagination and data",
      response.pagination !== undefined && response.data !== undefined,
    );
  }

  // Calculate concurrent performance metrics
  const sortedConcurrentTimes = concurrentLoadTimes.sort((a, b) => a - b);
  const concurrentP95Index = Math.floor(sortedConcurrentTimes.length * 0.95);
  const concurrentP95 = sortedConcurrentTimes[concurrentP95Index];

  TestValidator.predicate(
    "concurrent requests meet performance targets under load",
    concurrentP95 <= 500,
  );

  // Summary validation: confirm all performance targets met
  TestValidator.predicate(
    "trending posts API meets all performance SLA targets",
    initialP95 <= 500 &&
      paginatedP95 <= 300 &&
      sequentialP95 <= 500 &&
      concurrentP95 <= 500,
  );
}
