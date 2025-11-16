import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityTrendingCommunity";
import type { IRedditCommunityTrendingStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityTrendingStatistics";

/**
 * Test trending community statistics retrieval on an empty or minimally active
 * platform.
 *
 * This test validates that the trending communities endpoint handles edge cases
 * gracefully when the platform has no communities, no recent activity, or all
 * communities have been soft-deleted. The endpoint must return a valid response
 * structure even when there are no trending communities to display.
 *
 * Test flow:
 *
 * 1. Call the trending communities statistics endpoint without any prior setup
 * 2. Validate the response structure matches IRedditCommunityTrendingStatistics
 *    schema
 * 3. Verify the endpoint returns successfully without errors
 * 4. Ensure response format consistency regardless of data availability
 */
export async function test_api_trending_communities_empty_platform(
  connection: api.IConnection,
) {
  // Call the trending communities endpoint on an empty/minimal platform
  const trendingStats: IRedditCommunityTrendingStatistics =
    await api.functional.redditCommunity.statistics.communities.trending(
      connection,
    );

  // Validate the complete response structure - this performs ALL necessary validations
  typia.assert(trendingStats);
}
