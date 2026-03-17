import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that the Popular Feed correctly applies time filters when using Top sorting method.
 *
 * This test verifies that the PATCH /redditClone/feeds/popular endpoint:
 * 1. Accepts all valid time filter values when sort='top'
 * 2. Returns properly structured responses for each time filter
 * 3. Handles default behavior when time filter is omitted
 * 4. Returns valid pagination metadata and post summaries
 *
 * Note: Actual time-based filtering validation (verifying posts fall within
 * time windows) requires controlled test data with specific created_at timestamps.
 * This test focuses on API parameter acceptance and response structure validation.
 */
export async function test_api_popular_feed_top_sorting_time_filters(
  connection: api.IConnection,
): Promise<void> {
  // Test Case 1: Top sorting with 'today' filter
  const todayResponse = await api.functional.redditClone.feeds.popular.index(
    connection,
    {
      body: {
        sort: "top",
        timeFilter: "today",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(todayResponse);
  TestValidator.predicate(
    "today response has pagination",
    todayResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "today response has data array",
    Array.isArray(todayResponse.data),
  );
  // Test Case 2: Top sorting with 'this_week' filter
  const weekResponse = await api.functional.redditClone.feeds.popular.index(
    connection,
    {
      body: {
        sort: "top",
        timeFilter: "this_week",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(weekResponse);
  TestValidator.predicate(
    "week response has pagination",
    weekResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "week response has data array",
    Array.isArray(weekResponse.data),
  );
  // Test Case 3: Top sorting with 'this_month' filter
  const monthResponse = await api.functional.redditClone.feeds.popular.index(
    connection,
    {
      body: {
        sort: "top",
        timeFilter: "this_month",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(monthResponse);
  TestValidator.predicate(
    "month response has pagination",
    monthResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "month response has data array",
    Array.isArray(monthResponse.data),
  );
  // Test Case 4: Top sorting with 'this_year' filter
  const yearResponse = await api.functional.redditClone.feeds.popular.index(
    connection,
    {
      body: {
        sort: "top",
        timeFilter: "this_year",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(yearResponse);
  TestValidator.predicate(
    "year response has pagination",
    yearResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "year response has data array",
    Array.isArray(yearResponse.data),
  );
  // Test Case 5: Top sorting with 'all_time' filter
  const allTimeResponse = await api.functional.redditClone.feeds.popular.index(
    connection,
    {
      body: {
        sort: "top",
        timeFilter: "all_time",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(allTimeResponse);
  TestValidator.predicate(
    "all_time response has pagination",
    allTimeResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "all_time response has data array",
    Array.isArray(allTimeResponse.data),
  );
  // Test Case 6: Top sorting without time filter (defaults to all_time behavior)
  const defaultResponse = await api.functional.redditClone.feeds.popular.index(
    connection,
    {
      body: {
        sort: "top",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default response has pagination",
    defaultResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "default response has data array",
    Array.isArray(defaultResponse.data),
  );
  // Validate pagination metadata structure for all responses
  const responses = [
    todayResponse,
    weekResponse,
    monthResponse,
    yearResponse,
    allTimeResponse,
    defaultResponse,
  ];
  const filterNames = [
    "today",
    "this_week",
    "this_month",
    "this_year",
    "all_time",
    "default",
  ];
  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    const filterName = filterNames[i];
    TestValidator.predicate(
      `${filterName} pagination current is valid`,
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      `${filterName} pagination limit is valid`,
      response.pagination.limit >= 1 && response.pagination.limit <= 100,
    );
    TestValidator.predicate(
      `${filterName} pagination records is non-negative`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `${filterName} pagination pages is non-negative`,
      response.pagination.pages >= 0,
    );
  }
}
