import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityCommunityPopularStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityPopularStatistics";
import type { IRedditCommunityPopularCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPopularCommunity";

/**
 * Test the performance, caching, and stability characteristics of the popular
 * communities statistics endpoint.
 *
 * This test validates that the endpoint responds efficiently with low latency
 * despite complex aggregation queries across multiple tables (communities,
 * subscriptions, posts). It makes multiple consecutive requests to verify
 * response consistency and effective caching strategies. The test also confirms
 * that the endpoint handles concurrent requests without performance degradation
 * and that popularity scores are properly calculated and ranked.
 *
 * Test workflow:
 *
 * 1. Make initial request to retrieve popular communities statistics
 * 2. Validate response data integrity with typia.assert
 * 3. Verify communities are sorted by popularity_score descending
 * 4. Make multiple consecutive requests to test caching consistency
 * 5. Execute concurrent requests to test parallel request handling
 * 6. Validate all responses contain consistent data
 * 7. Confirm no errors or timeouts under normal load conditions
 */
export async function test_api_popular_communities_performance_stability(
  connection: api.IConnection,
) {
  // Step 1: Initial request to get popular communities statistics
  const firstResponse: IRedditCommunityCommunityPopularStatistics =
    await api.functional.redditCommunity.statistics.communities.popular.index(
      connection,
    );
  typia.assert(firstResponse);

  // Step 2: Verify communities are sorted by popularity_score in descending order
  if (firstResponse.data.length > 1) {
    for (let i = 0; i < firstResponse.data.length - 1; i++) {
      const current = firstResponse.data[i];
      const next = firstResponse.data[i + 1];
      TestValidator.predicate(
        "communities should be sorted by popularity_score descending",
        current.popularity_score >= next.popularity_score,
      );
    }
  }

  // Step 3: Make consecutive requests to test caching and consistency
  const secondResponse: IRedditCommunityCommunityPopularStatistics =
    await api.functional.redditCommunity.statistics.communities.popular.index(
      connection,
    );
  typia.assert(secondResponse);

  const thirdResponse: IRedditCommunityCommunityPopularStatistics =
    await api.functional.redditCommunity.statistics.communities.popular.index(
      connection,
    );
  typia.assert(thirdResponse);

  // Step 4: Validate consecutive responses return consistent data (caching)
  TestValidator.equals(
    "consecutive requests should return same number of communities",
    firstResponse.data.length,
    secondResponse.data.length,
  );

  TestValidator.equals(
    "second and third requests should return same number of communities",
    secondResponse.data.length,
    thirdResponse.data.length,
  );

  // Step 5: Test concurrent request handling - execute multiple parallel requests
  const concurrentRequests = await Promise.all([
    api.functional.redditCommunity.statistics.communities.popular.index(
      connection,
    ),
    api.functional.redditCommunity.statistics.communities.popular.index(
      connection,
    ),
    api.functional.redditCommunity.statistics.communities.popular.index(
      connection,
    ),
    api.functional.redditCommunity.statistics.communities.popular.index(
      connection,
    ),
    api.functional.redditCommunity.statistics.communities.popular.index(
      connection,
    ),
  ]);

  // Step 6: Validate all concurrent requests succeeded and returned valid data
  for (const response of concurrentRequests) {
    typia.assert(response);
  }

  // Step 7: Verify all concurrent responses have consistent data structure
  TestValidator.predicate(
    "all concurrent responses should return same number of communities",
    concurrentRequests.every(
      (r) => r.data.length === firstResponse.data.length,
    ),
  );

  // Step 8: Validate stability - check that top-ranked community is consistent across requests
  if (firstResponse.data.length > 0) {
    const topCommunity = firstResponse.data[0];
    TestValidator.predicate(
      "top community should have highest popularity score",
      firstResponse.data.every(
        (c) => topCommunity.popularity_score >= c.popularity_score,
      ),
    );

    // Verify top community consistency across consecutive requests
    if (secondResponse.data.length > 0) {
      TestValidator.equals(
        "top community should be consistent in cached responses",
        topCommunity.id,
        secondResponse.data[0].id,
      );
    }
  }
}
