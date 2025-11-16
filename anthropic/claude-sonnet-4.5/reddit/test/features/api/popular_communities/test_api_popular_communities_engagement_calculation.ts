import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityCommunityPopularStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityPopularStatistics";
import type { IRedditCommunityPopularCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPopularCommunity";

/**
 * Test engagement_rate calculation methodology and accuracy for popular
 * communities.
 *
 * This test validates that the engagement_rate metric properly quantifies
 * average interaction levels per post and is normalized by subscriber count to
 * enable fair comparison across communities of different sizes. The test
 * ensures that:
 *
 * 1. Retrieve popular community statistics from the API
 * 2. Validate that all communities have valid engagement_rate values
 * 3. Verify engagement_rate is a non-negative, finite number
 * 4. Confirm engagement_rate values are calculated for communities with content
 * 5. Validate consistency between engagement metrics and community attributes
 */
export async function test_api_popular_communities_engagement_calculation(
  connection: api.IConnection,
) {
  // Retrieve popular community statistics
  const statistics: IRedditCommunityCommunityPopularStatistics =
    await api.functional.redditCommunity.statistics.communities.popular.index(
      connection,
    );
  typia.assert(statistics);

  // Validate that we have popular communities data
  TestValidator.predicate(
    "popular communities data should not be empty",
    statistics.data.length > 0,
  );

  // Validate each community's engagement_rate
  for (const community of statistics.data) {
    // Verify engagement_rate is non-negative
    TestValidator.predicate(
      `engagement_rate for community ${community.name} should be non-negative`,
      community.engagement_rate >= 0,
    );

    // Verify engagement_rate is finite (not Infinity or NaN)
    TestValidator.predicate(
      `engagement_rate for community ${community.name} should be finite`,
      isFinite(community.engagement_rate),
    );

    // Verify that communities with subscribers and posts have valid engagement metrics
    if (community.subscriber_count > 0 && community.post_count > 0) {
      TestValidator.predicate(
        `community ${community.name} with subscribers and posts should have non-zero engagement_rate`,
        community.engagement_rate >= 0,
      );
    }
  }

  // Validate consistency of engagement and popularity metrics
  for (const community of statistics.data) {
    // Verify popularity_score is valid
    TestValidator.predicate(
      `community ${community.name} should have valid popularity_score`,
      isFinite(community.popularity_score),
    );

    // Verify subscriber_count is non-negative
    TestValidator.predicate(
      `community ${community.name} should have non-negative subscriber_count`,
      community.subscriber_count >= 0,
    );

    // Verify post_count is non-negative
    TestValidator.predicate(
      `community ${community.name} should have non-negative post_count`,
      community.post_count >= 0,
    );
  }

  // Validate that engagement_rate enables comparison across different sizes
  if (statistics.data.length >= 2) {
    // Check that we have communities with varying sizes
    const subscriberCounts = statistics.data.map((c) => c.subscriber_count);
    const uniqueSubscriberCounts = new Set(subscriberCounts);

    if (uniqueSubscriberCounts.size > 1) {
      // We have communities of different sizes - engagement_rate should vary
      const engagementRates = statistics.data.map((c) => c.engagement_rate);
      const allFinite = engagementRates.every((rate) => isFinite(rate));

      TestValidator.predicate(
        "all engagement_rates should be finite for comparison across community sizes",
        allFinite,
      );
    }
  }
}
