import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the Top sorting functionality with time range filtering on the Popular Feed.
 *
 * Validates the popular feed endpoint's sorting and time range filtering capabilities. Tests all combinations of sort='top' with different timeRange values to ensure the API correctly accepts and processes these parameters. Verifies that posts are ordered by vote_score in descending order and that response structure conforms to expected schema.
 *
 * Since this is a read-only feed endpoint without post creation APIs available in the test scope, the test focuses on validating the API contract, response structure, sorting order, and parameter acceptance rather than time-based filtering logic which would require controlled test data with specific creation dates.
 *
 * 1. Tests sort='top' with timeRange='today' - validates response structure and sorting.
 * 2. Tests sort='top' with timeRange='thisWeek' - validates response structure and sorting.
 * 3. Tests sort='top' with timeRange='thisMonth' - validates response structure and sorting.
 * 4. Tests sort='top' with timeRange='thisYear' - validates response structure and sorting.
 * 5. Tests sort='top' with timeRange='allTime' - validates response structure and sorting.
 * 6. Tests sort='hot', 'new', 'controversial' with timeRange to ensure no errors.
 * 7. Validates pagination metadata is correctly returned in all responses.
 * 8. Verifies posts are sorted by vote_score descending when sort='top'.
 */
export async function test_api_popular_feed_top_sorting_with_time_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test sort='top' with all timeRange values
  const timeRanges = [
    "today",
    "thisWeek",
    "thisMonth",
    "thisYear",
    "allTime",
  ] as const;
  for (const timeRange of timeRanges) {
    const body: IRedditCommunityPost.IRequest = {
      sort: "top",
      timeRange: timeRange,
      take: 20,
    };
    const response = await api.functional.redditCommunity.feeds.popular.index(
      connection,
      {
        body,
      },
    );
    typia.assert(response);
    // Validate posts are sorted by vote_score descending (if multiple posts exist)
    if (response.data.length > 1) {
      for (let i = 0; i < response.data.length - 1; i++) {
        TestValidator.predicate(
          `posts sorted by vote_score desc for ${timeRange}`,
          response.data[i].vote_score >= response.data[i + 1].vote_score,
        );
      }
    }
  }
  // Test that timeRange doesn't cause errors with non-'top' sort values
  const otherSorts = ["hot", "new", "controversial"] as const;
  for (const sort of otherSorts) {
    const body: IRedditCommunityPost.IRequest = {
      sort: sort,
      timeRange: "thisWeek",
      take: 10,
    };
    const response = await api.functional.redditCommunity.feeds.popular.index(
      connection,
      {
        body,
      },
    );
    typia.assert(response);
  }
  // Test default behavior (no sort specified)
  const defaultResponse =
    await api.functional.redditCommunity.feeds.popular.index(connection, {
      body: {
        take: 15,
      },
    });
  typia.assert(defaultResponse);
}
