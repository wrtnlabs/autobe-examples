import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_communities_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Sort by most subscribed (descending)
  const mostSubscribedResult =
    await api.functional.redditPlatform.communities.index(connection, {
      body: {
        sortBy: "most_subscribed",
        order: "desc",
        page: 1,
        limit: 10,
      },
    });
  typia.assert(mostSubscribedResult);
  // Validate basic structure (ISummary is empty, so can't validate community content)
  TestValidator.equals(
    "result data is array",
    Array.isArray(mostSubscribedResult.data),
    true,
  );
  TestValidator.equals(
    "pagination exists",
    mostSubscribedResult.pagination !== undefined,
    true,
  );
  // Test 2: Sort by newest (descending)
  const newestResult = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {
        sortBy: "newest",
        order: "desc",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(newestResult);
  TestValidator.equals(
    "newest result has data array",
    Array.isArray(newestResult.data),
    true,
  );
  // Test 3: Pagination verification
  const paginatedResult = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      },
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.data.length,
    5,
  );
  // Test 4: Ascending order
  const ascendingResult = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {
        sortBy: "most_subscribed",
        order: "asc",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(ascendingResult);
  TestValidator.equals(
    "ascending result data array exists",
    Array.isArray(ascendingResult.data),
    true,
  );
  // Test 5: Empty result set handling
  const emptyResult = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {
        minSubscribers: 1000000, // Very high minimum to get empty result
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result has zero count",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result has zero pagination",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has zero pages",
    emptyResult.pagination.pages,
    0,
  );
  // Test 6: Filter by minimum subscribers
  const minSubscribers = 500;
  const filterResult = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {
        minSubscribers,
        sortBy: "most_subscribed",
        order: "desc",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(filterResult);
  TestValidator.equals(
    "filtered result data array exists",
    Array.isArray(filterResult.data),
    true,
  );
}
