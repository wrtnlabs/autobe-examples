import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityTrendingCommunity";
import type { IRedditCommunityTrendingStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityTrendingStatistics";

/**
 * Test the quality and consistency of trending community data.
 *
 * Validates that all communities in the trending statistics response have:
 *
 * - Valid UUIDs for id and creator_member_id (validated by typia)
 * - Community names following platform conventions (3-21 chars, lowercase
 *   alphanumeric + underscores)
 * - Display titles within 100 characters
 * - Descriptions within 500 characters
 * - Non-negative integer counts (validated by typia)
 * - Valid numeric values (validated by typia)
 * - Valid URI formats when present (validated by typia)
 * - Logical timestamp ordering (created_at before updated_at)
 * - Consistent trending order across multiple requests
 * - Diverse community sizes (mix of established and emerging communities)
 */
export async function test_api_trending_communities_data_quality(
  connection: api.IConnection,
) {
  // Step 1: Fetch trending communities data
  const trendingStats: IRedditCommunityTrendingStatistics =
    await api.functional.redditCommunity.statistics.communities.trending(
      connection,
    );

  // Step 2: Validate response structure with typia (validates UUIDs, URIs, types, constraints)
  typia.assert(trendingStats);

  // Step 3: Ensure we have data to validate
  TestValidator.predicate(
    "trending statistics should contain communities",
    trendingStats.data.length > 0,
  );

  // Step 4: Validate each community's business logic and data quality
  for (const community of trendingStats.data) {
    // Validate community name follows platform convention (3-21 chars, lowercase alphanumeric + underscores)
    TestValidator.predicate(
      `community name ${community.name} follows platform convention`,
      community.name.length >= 3 &&
        community.name.length <= 21 &&
        /^[a-z0-9_]+$/.test(community.name),
    );

    // Validate display_title length
    TestValidator.predicate(
      `community ${community.name} display_title within 100 characters`,
      community.display_title.length <= 100,
    );

    // Validate description length
    TestValidator.predicate(
      `community ${community.name} description within 500 characters`,
      community.description.length <= 500,
    );

    // Validate growth_rate is realistic (between -100% and 1000%)
    TestValidator.predicate(
      `community ${community.name} has realistic growth_rate`,
      community.growth_rate >= -100 && community.growth_rate <= 1000,
    );

    // Validate created_at is earlier than or equal to updated_at
    const createdAt = new Date(community.created_at);
    const updatedAt = new Date(community.updated_at);
    TestValidator.predicate(
      `community ${community.name} created_at is before or equal to updated_at`,
      createdAt <= updatedAt,
    );

    // Validate deleted_at is null (trending communities should not be deleted)
    TestValidator.predicate(
      `community ${community.name} is not deleted`,
      community.deleted_at === null || community.deleted_at === undefined,
    );
  }

  // Step 5: Test algorithm consistency - make multiple requests and verify stable ordering
  const secondRequest: IRedditCommunityTrendingStatistics =
    await api.functional.redditCommunity.statistics.communities.trending(
      connection,
    );
  typia.assert(secondRequest);

  // Extract community IDs from both requests
  const firstOrderIds = trendingStats.data.map((c) => c.id);
  const secondOrderIds = secondRequest.data.map((c) => c.id);

  // Verify that the trending order is consistent (same IDs in same order)
  TestValidator.equals(
    "trending order is consistent between requests",
    firstOrderIds,
    secondOrderIds,
  );

  // Step 6: Validate data diversity - check for mix of community sizes
  const subscriberCounts = trendingStats.data.map((c) => c.subscriber_count);
  const minSubscribers = Math.min(...subscriberCounts);
  const maxSubscribers = Math.max(...subscriberCounts);

  // If there are multiple communities, there should be some diversity
  if (trendingStats.data.length > 1) {
    TestValidator.predicate(
      "trending communities show diversity in subscriber counts",
      maxSubscribers > minSubscribers,
    );
  }
}
