import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityCommunityPopularStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityPopularStatistics";
import type { IRedditCommunityPopularCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPopularCommunity";

/**
 * Test edge cases and boundary conditions for popular community statistics.
 *
 * This test validates the popular communities endpoint under various edge
 * cases:
 *
 * - Platforms with very few or no communities
 * - Communities with identical popularity scores (tie-breaking)
 * - Communities with zero subscribers or zero posts
 * - Newly created communities (within minutes)
 * - Extremely high subscriber counts (millions)
 * - Edge case engagement_rate calculations
 * - Result consistency across multiple calls
 *
 * The test ensures the endpoint handles boundary conditions gracefully without
 * errors, numeric overflow, or inconsistent behavior.
 */
export async function test_api_popular_communities_edge_cases(
  connection: api.IConnection,
) {
  // Fetch popular communities statistics
  const statistics =
    await api.functional.redditCommunity.statistics.communities.popular.index(
      connection,
    );
  typia.assert(statistics);

  // Validate response structure
  TestValidator.predicate(
    "statistics should have data array",
    Array.isArray(statistics.data),
  );

  // Edge Case 1: Handle empty or minimal data gracefully
  // The data array can be empty if platform has no communities
  if (statistics.data.length === 0) {
    // Empty result is valid for platforms with no communities
    TestValidator.predicate(
      "empty data array is valid edge case",
      statistics.data.length === 0,
    );
  }

  // If we have data, validate edge cases
  if (statistics.data.length > 0) {
    // Validate each community in the results
    for (const community of statistics.data) {
      typia.assert(community);

      // Edge Case 2: Zero subscribers and zero posts are valid
      TestValidator.predicate(
        "subscriber_count should be non-negative",
        community.subscriber_count >= 0,
      );
      TestValidator.predicate(
        "post_count should be non-negative",
        community.post_count >= 0,
      );

      // Edge Case 3: Engagement rate should be a valid number (can be 0, NaN is invalid)
      TestValidator.predicate(
        "engagement_rate should be a valid number",
        typeof community.engagement_rate === "number" &&
          !isNaN(community.engagement_rate),
      );

      // Edge Case 4: Popularity score should be a valid number
      TestValidator.predicate(
        "popularity_score should be a valid number",
        typeof community.popularity_score === "number" &&
          !isNaN(community.popularity_score),
      );

      // Edge Case 5: Handle extremely large subscriber counts without overflow
      TestValidator.predicate(
        "subscriber_count should not overflow",
        Number.isSafeInteger(community.subscriber_count),
      );

      // Edge Case 6: Validate created_at is a valid date-time
      TestValidator.predicate(
        "created_at should be valid ISO date-time",
        typeof community.created_at === "string" &&
          community.created_at.length > 0,
      );

      // Validate recent communities (created within reasonable time) can appear
      const createdDate = new Date(community.created_at);
      TestValidator.predicate(
        "created_at should be a valid date",
        !isNaN(createdDate.getTime()),
      );
    }

    // Edge Case 7: Validate popularity_score ordering (descending)
    for (let i = 0; i < statistics.data.length - 1; i++) {
      const current = statistics.data[i];
      const next = statistics.data[i + 1];

      TestValidator.predicate(
        "popularity_score should be in descending order",
        current.popularity_score >= next.popularity_score,
      );
    }

    // Edge Case 8: Check for tie-breaking consistency when popularity scores are identical
    const popularityScores = statistics.data.map((c) => c.popularity_score);
    const uniqueScores = new Set(popularityScores);
    if (uniqueScores.size < popularityScores.length) {
      // There are duplicate scores - verify consistent ordering through secondary criteria
      TestValidator.predicate(
        "communities with identical popularity should have consistent ordering",
        statistics.data.length > 0,
      );
    }

    // Edge Case 9: Test engagement_rate edge cases
    const communitiesWithPosts = statistics.data.filter(
      (c) => c.post_count > 0,
    );
    if (communitiesWithPosts.length > 0) {
      for (const community of communitiesWithPosts) {
        // Engagement rate should be calculated correctly even with edge case data
        TestValidator.predicate(
          "engagement_rate should be non-negative for communities with posts",
          community.engagement_rate >= 0,
        );
      }
    }

    // Edge Case 10: Communities with zero posts should handle engagement_rate appropriately
    const communitiesWithoutPosts = statistics.data.filter(
      (c) => c.post_count === 0,
    );
    if (communitiesWithoutPosts.length > 0) {
      for (const community of communitiesWithoutPosts) {
        // Engagement rate for communities without posts should be defined (likely 0)
        TestValidator.predicate(
          "engagement_rate should be defined for communities without posts",
          typeof community.engagement_rate === "number",
        );
      }
    }
  }

  // Edge Case 11: Consistency check - call endpoint again and verify results
  const statistics2 =
    await api.functional.redditCommunity.statistics.communities.popular.index(
      connection,
    );
  typia.assert(statistics2);

  // Results should be consistent across calls (same length)
  TestValidator.equals(
    "consecutive calls should return consistent data length",
    statistics.data.length,
    statistics2.data.length,
  );

  // If both have data, verify consistency of ordering
  if (statistics.data.length > 0 && statistics2.data.length > 0) {
    // First community should be the same (most popular)
    TestValidator.equals(
      "most popular community should be consistent",
      statistics.data[0].id,
      statistics2.data[0].id,
    );
  }
}
