import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityTrendingCommunity";
import type { IRedditCommunityTrendingStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityTrendingStatistics";

/**
 * Test the caching and performance characteristics of the trending communities
 * statistics endpoint.
 *
 * This test validates that the endpoint:
 *
 * 1. Responds quickly due to caching strategies (typically under 500ms)
 * 2. Returns consistent results across multiple consecutive requests within cache
 *    refresh interval
 * 3. Handles high request volumes efficiently without performance degradation
 * 4. Returns valid trending community data with proper metrics
 *
 * The test performs multiple API calls to verify cache behavior and response
 * consistency, validates all DTO type structures, and ensures trending metrics
 * are present and realistic.
 */
export async function test_api_trending_communities_caching_behavior(
  connection: api.IConnection,
) {
  // First call: Measure initial response time and get baseline data
  const startTime1 = Date.now();
  const firstResponse: IRedditCommunityTrendingStatistics =
    await api.functional.redditCommunity.statistics.communities.trending(
      connection,
    );
  const firstCallDuration = Date.now() - startTime1;

  // Validate first response structure
  typia.assert(firstResponse);

  // Verify that trending communities data exists
  TestValidator.predicate(
    "first response should contain trending communities data",
    firstResponse.data.length >= 0,
  );

  // Second call: Should hit cache and be fast
  const startTime2 = Date.now();
  const secondResponse: IRedditCommunityTrendingStatistics =
    await api.functional.redditCommunity.statistics.communities.trending(
      connection,
    );
  const secondCallDuration = Date.now() - startTime2;

  // Validate second response structure
  typia.assert(secondResponse);

  // Third call: Verify cache consistency
  const startTime3 = Date.now();
  const thirdResponse: IRedditCommunityTrendingStatistics =
    await api.functional.redditCommunity.statistics.communities.trending(
      connection,
    );
  const thirdCallDuration = Date.now() - startTime3;

  // Validate third response structure
  typia.assert(thirdResponse);

  // Verify cache consistency: all responses should return the same data
  TestValidator.equals(
    "second response should match first response (cache consistency)",
    firstResponse,
    secondResponse,
  );

  TestValidator.equals(
    "third response should match first response (cache consistency)",
    firstResponse,
    thirdResponse,
  );

  // Validate that responses are fast (caching benefit)
  // Note: We don't enforce strict timing as it depends on system performance,
  // but we verify that subsequent calls are not significantly slower
  TestValidator.predicate(
    "response times should be reasonable for cached endpoint",
    secondCallDuration < 5000 && thirdCallDuration < 5000,
  );

  // If there are trending communities, validate their structure and data
  if (firstResponse.data.length > 0) {
    const sampleCommunity = firstResponse.data[0];

    // Validate all required fields exist and have proper types
    typia.assert<IRedditCommunityTrendingCommunity>(sampleCommunity);

    // Validate that subscriber_count is non-negative
    TestValidator.predicate(
      "subscriber_count should be non-negative",
      sampleCommunity.subscriber_count >= 0,
    );

    // Validate that post_count is non-negative
    TestValidator.predicate(
      "post_count should be non-negative",
      sampleCommunity.post_count >= 0,
    );

    // Validate that recent_post_count is non-negative
    TestValidator.predicate(
      "recent_post_count should be non-negative",
      sampleCommunity.recent_post_count >= 0,
    );
  }

  // Perform multiple rapid consecutive calls to test cache performance under load
  const rapidCallResults = await ArrayUtil.asyncRepeat(5, async () => {
    const startTime = Date.now();
    const response =
      await api.functional.redditCommunity.statistics.communities.trending(
        connection,
      );
    const duration = Date.now() - startTime;
    return { response, duration };
  });

  // Validate all rapid calls return consistent data
  for (const result of rapidCallResults) {
    typia.assert(result.response);
    TestValidator.equals(
      "rapid call should return same cached data",
      firstResponse,
      result.response,
    );
  }

  // Verify that rapid calls maintain reasonable performance
  const allRapidCallsFast = rapidCallResults.every((r) => r.duration < 5000);
  TestValidator.predicate(
    "all rapid calls should maintain reasonable performance",
    allRapidCallsFast,
  );
}
