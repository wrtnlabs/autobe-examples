import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityTrendingCommunity";
import type { IRedditCommunityTrendingStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityTrendingStatistics";

/**
 * Test public access to trending community statistics without authentication.
 *
 * This test validates that guest users can retrieve trending community data
 * from the public endpoint. It verifies the response structure, validates that
 * numeric metrics are non-negative, and confirms that deleted communities are
 * excluded from the trending list.
 *
 * Steps:
 *
 * 1. Call trending communities endpoint without authentication
 * 2. Validate response structure with typia.assert (handles all type validation)
 * 3. Verify business rules: non-negative metrics and no deleted communities
 */
export async function test_api_trending_communities_public_access(
  connection: api.IConnection,
) {
  // Call the trending communities endpoint without authentication
  const statistics: IRedditCommunityTrendingStatistics =
    await api.functional.redditCommunity.statistics.communities.trending(
      connection,
    );

  // Validate the complete response structure (handles ALL type validation)
  typia.assert(statistics);

  // Verify business logic rules for each trending community
  statistics.data.forEach((community, index) => {
    // Verify numeric metrics are non-negative
    TestValidator.predicate(
      `community ${index} subscriber_count should be non-negative`,
      community.subscriber_count >= 0,
    );

    TestValidator.predicate(
      `community ${index} post_count should be non-negative`,
      community.post_count >= 0,
    );

    TestValidator.predicate(
      `community ${index} recent_post_count should be non-negative`,
      community.recent_post_count >= 0,
    );

    // Verify deleted communities are excluded from trending list
    TestValidator.predicate(
      `community ${index} should not be deleted`,
      community.deleted_at === null || community.deleted_at === undefined,
    );
  });
}
