import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingCommunity";

/**
 * Validates community ranking consistency in trending results.
 *
 * This test ensures that community rankings in the trending endpoint remain
 * consistent and deterministic across multiple requests. Within a single
 * refresh interval, the same community should always appear at the same rank
 * position, providing users with a stable view of trending communities.
 *
 * The test validates:
 *
 * 1. Ranking consistency: Multiple API calls return communities in the same order
 * 2. Primary ranking: Communities are ordered by trend_velocity (growth rate)
 * 3. Secondary ranking: When velocities are equal, subscriber_count breaks ties
 * 4. Deterministic ordering: Identical requests yield identical results
 *
 * This is critical for user experience as users expect consistent trending
 * lists when browsing, and sudden rank changes within a refresh interval would
 * be confusing.
 */
export async function test_api_trending_communities_ranking_consistency(
  connection: api.IConnection,
) {
  // Request trending communities for the first time
  const firstResponse: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );
  typia.assert(firstResponse);

  // Extract first ranking
  const firstRanking = firstResponse.data.map((c) => ({
    id: c.id,
    rank: c.rank,
    trendVelocity: c.trendVelocity,
    subscriberCount: c.subscriberCount,
  }));

  TestValidator.predicate(
    "first response should contain trending communities",
    firstRanking.length > 0,
  );

  // Request trending communities again (within refresh interval)
  const secondResponse: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );
  typia.assert(secondResponse);

  // Extract second ranking
  const secondRanking = secondResponse.data.map((c) => ({
    id: c.id,
    rank: c.rank,
    trendVelocity: c.trendVelocity,
    subscriberCount: c.subscriberCount,
  }));

  // Validate ranking consistency
  TestValidator.equals(
    "trending community rankings should be consistent across requests",
    firstRanking,
    secondRanking,
  );

  // Validate primary ranking by trend_velocity
  for (let i = 0; i < firstRanking.length - 1; i++) {
    const current = firstResponse.data[i];
    const next = firstResponse.data[i + 1];

    // Communities should be ordered by rank (1, 2, 3, ...)
    TestValidator.predicate(
      `rank should be sequential at position ${i}`,
      current.rank === i + 1,
    );

    // If trend velocities differ, higher velocity should come first
    if (
      current.trendVelocity !== null &&
      current.trendVelocity !== undefined &&
      next.trendVelocity !== null &&
      next.trendVelocity !== undefined &&
      current.trendVelocity !== next.trendVelocity
    ) {
      TestValidator.predicate(
        `higher trend velocity should rank higher at position ${i}`,
        current.trendVelocity >= next.trendVelocity,
      );
    }

    // Test secondary ranking: when velocities are equal, subscriber_count breaks ties
    if (
      current.trendVelocity === next.trendVelocity &&
      current.trendVelocity !== null &&
      current.trendVelocity !== undefined
    ) {
      TestValidator.predicate(
        `when velocities are equal, higher subscriber count should rank higher at position ${i}`,
        current.subscriberCount >= next.subscriberCount,
      );
    }
  }

  // Request a third time to ensure deterministic behavior
  const thirdResponse: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );
  typia.assert(thirdResponse);

  // Validate consistency with third request
  const thirdRanking = thirdResponse.data.map((c) => ({
    id: c.id,
    rank: c.rank,
  }));

  const firstRankingSimple = firstResponse.data.map((c) => ({
    id: c.id,
    rank: c.rank,
  }));

  TestValidator.equals(
    "trending community ranking should remain deterministic across multiple requests",
    firstRankingSimple,
    thirdRanking,
  );

  // Validate that all communities have unique ranks within the response
  const rankSet = new Set(firstResponse.data.map((c) => c.rank));
  TestValidator.predicate(
    "all communities should have unique ranks",
    rankSet.size === firstResponse.data.length,
  );
}
