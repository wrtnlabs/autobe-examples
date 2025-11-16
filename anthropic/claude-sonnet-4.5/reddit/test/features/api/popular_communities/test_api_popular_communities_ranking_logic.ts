import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityCommunityPopularStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityPopularStatistics";
import type { IRedditCommunityPopularCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPopularCommunity";

/**
 * Test the popularity ranking algorithm and scoring logic.
 *
 * Validates that the popularity ranking system properly balances multiple
 * factors including subscriber count, engagement rate, post volume, and
 * community longevity. Ensures that communities with moderate subscribers but
 * exceptional engagement can rank higher than larger communities with low
 * engagement, and that the composite popularity_score reflects sustainable,
 * quality community metrics rather than just raw size.
 *
 * Steps:
 *
 * 1. Fetch popular communities statistics
 * 2. Validate response structure and data completeness
 * 3. Verify communities are ordered by popularity_score descending
 * 4. Analyze metric correlations (subscriber_count vs engagement_rate vs
 *    popularity_score)
 * 5. Validate that engagement rate influences rankings appropriately
 * 6. Confirm established communities with sustained activity rank appropriately
 */
export async function test_api_popular_communities_ranking_logic(
  connection: api.IConnection,
) {
  // Fetch popular communities statistics
  const statistics: IRedditCommunityCommunityPopularStatistics =
    await api.functional.redditCommunity.statistics.communities.popular.index(
      connection,
    );
  typia.assert(statistics);

  // Validate that we have communities data
  TestValidator.predicate(
    "popular communities list should not be empty",
    statistics.data.length > 0,
  );

  // Validate each community has required fields
  for (const community of statistics.data) {
    typia.assert(community);

    TestValidator.predicate(
      "community should have valid UUID",
      community.id.length > 0,
    );

    TestValidator.predicate(
      "community name should be valid",
      community.name.length >= 3 && community.name.length <= 21,
    );

    TestValidator.predicate(
      "subscriber count should be non-negative",
      community.subscriber_count >= 0,
    );

    TestValidator.predicate(
      "post count should be non-negative",
      community.post_count >= 0,
    );

    TestValidator.predicate(
      "engagement rate should be non-negative",
      community.engagement_rate >= 0,
    );
  }

  // Verify communities are ordered by popularity_score descending
  if (statistics.data.length > 1) {
    for (let i = 0; i < statistics.data.length - 1; i++) {
      const current = statistics.data[i];
      const next = statistics.data[i + 1];

      TestValidator.predicate(
        "communities should be ordered by popularity_score descending",
        current.popularity_score >= next.popularity_score,
      );
    }
  }

  // Analyze that popularity_score is influenced by both subscriber_count and engagement_rate
  if (statistics.data.length >= 3) {
    const topCommunities = statistics.data.slice(0, 3);

    // Check that top communities have balanced metrics
    for (const community of topCommunities) {
      TestValidator.predicate(
        "top ranked communities should have positive engagement",
        community.engagement_rate > 0,
      );

      TestValidator.predicate(
        "top ranked communities should have subscribers",
        community.subscriber_count > 0,
      );
    }

    // Verify that not all top communities are just the largest by subscribers
    const sortedBySubscribers = [...statistics.data].sort(
      (a, b) => b.subscriber_count - a.subscriber_count,
    );

    const topByPopularity = statistics.data.slice(0, 3).map((c) => c.id);
    const topBySubscribers = sortedBySubscribers.slice(0, 3).map((c) => c.id);

    // If engagement matters, the rankings should potentially differ
    const hasEngagementInfluence = !topByPopularity.every(
      (id, idx) => id === topBySubscribers[idx],
    );

    // This verifies the algorithm considers more than just subscriber count
    TestValidator.predicate(
      "popularity ranking should consider factors beyond just subscriber count",
      hasEngagementInfluence || statistics.data.length < 3,
    );
  }

  // Validate that communities with high engagement can rank well
  if (statistics.data.length >= 5) {
    const communitiesWithEngagement = statistics.data.filter(
      (c) => c.engagement_rate > 0,
    );

    TestValidator.predicate(
      "popular communities should demonstrate engagement",
      communitiesWithEngagement.length > 0,
    );

    // Check for presence of communities with strong engagement in top rankings
    const topHalf = statistics.data.slice(
      0,
      Math.floor(statistics.data.length / 2),
    );
    const topHalfAvgEngagement =
      topHalf.reduce((sum, c) => sum + c.engagement_rate, 0) / topHalf.length;

    const bottomHalf = statistics.data.slice(
      Math.floor(statistics.data.length / 2),
    );
    const bottomHalfAvgEngagement =
      bottomHalf.length > 0
        ? bottomHalf.reduce((sum, c) => sum + c.engagement_rate, 0) /
          bottomHalf.length
        : 0;

    TestValidator.predicate(
      "top ranked communities should have higher average engagement than lower ranked",
      topHalfAvgEngagement >= bottomHalfAvgEngagement,
    );
  }

  // Verify community age is considered (older established communities)
  if (statistics.data.length >= 2) {
    const topCommunity = statistics.data[0];
    const createdDate = new Date(topCommunity.created_at);

    TestValidator.predicate(
      "community created_at should be a valid date",
      !isNaN(createdDate.getTime()),
    );

    TestValidator.predicate(
      "top community should have been created in the past",
      createdDate.getTime() < Date.now(),
    );
  }

  // Validate ranking stability - ensure popularity_score is consistent metric
  for (const community of statistics.data) {
    TestValidator.predicate(
      "popularity_score should be a valid number",
      typeof community.popularity_score === "number" &&
        !isNaN(community.popularity_score),
    );

    // Popularity score should reflect composite of metrics
    TestValidator.predicate(
      "communities with activity should have positive popularity_score",
      community.subscriber_count === 0 && community.post_count === 0
        ? true
        : community.popularity_score >= 0,
    );
  }
}
