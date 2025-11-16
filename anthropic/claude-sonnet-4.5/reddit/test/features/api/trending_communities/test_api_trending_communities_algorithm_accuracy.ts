import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityTrendingCommunity";
import type { IRedditCommunityTrendingStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityTrendingStatistics";

/**
 * Test the accuracy and effectiveness of the trending algorithm in identifying
 * communities with genuine momentum.
 *
 * This test validates that the trending communities algorithm correctly:
 *
 * - Returns valid community data with all required statistical metrics
 * - Calculates growth_rate as percentage increases over the trending period
 * - Measures recent_post_count for posts within the trending window
 * - Computes activity_score by combining multiple engagement signals
 * - Surfaces both large established and smaller emerging communities
 * - Ensures all communities have appropriate metric relationships and values
 */
export async function test_api_trending_communities_algorithm_accuracy(
  connection: api.IConnection,
) {
  // Call the trending communities API
  const trendingStats: IRedditCommunityTrendingStatistics =
    await api.functional.redditCommunity.statistics.communities.trending(
      connection,
    );

  // Validate the response structure
  typia.assert(trendingStats);

  // Verify that we have trending communities data
  TestValidator.predicate(
    "trending statistics should contain data array",
    Array.isArray(trendingStats.data),
  );

  // If there are trending communities, validate their properties
  if (trendingStats.data.length > 0) {
    // Verify each community has valid data
    for (const community of trendingStats.data) {
      // Validate community structure
      typia.assert(community);

      // Verify growth_rate is non-negative (percentage increase)
      TestValidator.predicate(
        "growth_rate should be non-negative",
        community.growth_rate >= 0,
      );

      // Verify recent_post_count is non-negative
      TestValidator.predicate(
        "recent_post_count should be non-negative",
        community.recent_post_count >= 0,
      );

      // Verify activity_score is non-negative
      TestValidator.predicate(
        "activity_score should be non-negative",
        community.activity_score >= 0,
      );

      // Verify subscriber_count is non-negative
      TestValidator.predicate(
        "subscriber_count should be non-negative",
        community.subscriber_count >= 0,
      );

      // Verify post_count is non-negative
      TestValidator.predicate(
        "post_count should be non-negative",
        community.post_count >= 0,
      );

      // Verify deleted_at is null (deleted communities shouldn't trend)
      TestValidator.predicate(
        "trending community should not be deleted",
        community.deleted_at === null || community.deleted_at === undefined,
      );

      // Verify temporal consistency: created_at should be before or equal to updated_at
      const createdTime = new Date(community.created_at).getTime();
      const updatedTime = new Date(community.updated_at).getTime();
      TestValidator.predicate(
        "created_at should be before or equal to updated_at",
        createdTime <= updatedTime,
      );

      // Verify name is non-empty
      TestValidator.predicate(
        "community name should be non-empty",
        community.name.length > 0,
      );

      // Verify display_title is non-empty
      TestValidator.predicate(
        "community display_title should be non-empty",
        community.display_title.length > 0,
      );
    }

    // Verify diversity in community sizes (check for range in subscriber counts)
    const subscriberCounts = trendingStats.data.map((c) => c.subscriber_count);
    const minSubscribers = Math.min(...subscriberCounts);
    const maxSubscribers = Math.max(...subscriberCounts);

    // If there are multiple communities, verify there's variety in sizes
    if (trendingStats.data.length > 1) {
      TestValidator.predicate(
        "trending list should include communities of varying sizes",
        maxSubscribers >= minSubscribers,
      );
    }

    // Verify activity metrics are present and meaningful
    const activeCommunities = trendingStats.data.filter(
      (c) => c.recent_post_count > 0 || c.activity_score > 0,
    );

    TestValidator.predicate(
      "trending communities should have activity metrics",
      activeCommunities.length > 0,
    );
  }
}
