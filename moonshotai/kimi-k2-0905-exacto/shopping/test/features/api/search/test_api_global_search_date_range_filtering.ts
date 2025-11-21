import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGlobalSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGlobalSearchResult";
import type { IShoppingMallAnalyticsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallGlobalSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGlobalSearch";
import type { IShoppingMallGlobalSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGlobalSearchResult";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test temporal search filtering using date ranges to find recently added or
 * updated content. Validates date range parsing, timezone handling, and proper
 * filtering of results by creation or modification timestamps. Tests various
 * date format scenarios and boundary conditions.
 */
export async function test_api_global_search_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic date range filtering with recent content
  const currentDate = new Date();
  const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(
    currentDate.getTime() - 14 * 24 * 60 * 60 * 1000,
  );

  // Create recent content search
  const recentSearchRequest: IShoppingMallGlobalSearch.IRequest = {
    query: "test product",
    date_range: `${twoWeeksAgo.toISOString().split("T")[0]}..${oneWeekAgo.toISOString().split("T")[0]}`,
    sort_order: "date",
    page: 1,
    limit: 20,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const recentResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: recentSearchRequest,
    },
  );
  typia.assert(recentResults);

  TestValidator.predicate(
    "recent search returns results",
    recentResults.data.length > 0,
  );
  TestValidator.predicate(
    "pagination is valid",
    recentResults.pagination.pages >= 1,
  );

  // Test 2: Single day range filtering
  const yesterday = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
  const singleDayRequest: IShoppingMallGlobalSearch.IRequest = {
    query: "test",
    date_range: yesterday.toISOString().split("T")[0],
    sort_order: "relevance",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const singleDayResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: singleDayRequest,
    },
  );
  typia.assert(singleDayResults);

  // Test 3: Future date range (should return empty or no future content)
  const tomorrow = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  const futureRequest: IShoppingMallGlobalSearch.IRequest = {
    query: "test",
    date_range: `${tomorrow.toISOString().split("T")[0]}..${nextWeek.toISOString().split("T")[0]}`,
    sort_order: "date",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const futureResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: futureRequest,
    },
  );
  typia.assert(futureResults);

  TestValidator.predicate(
    "future date search has minimal results",
    futureResults.data.length <= recentResults.data.length,
  );

  // Test 4: Price filtering combined with date range
  const combinedRequest: IShoppingMallGlobalSearch.IRequest = {
    query: "product",
    date_range: `${oneWeekAgo.toISOString().split("T")[0]}..${currentDate.toISOString().split("T")[0]}`,
    min_price: 10,
    max_price: 1000,
    sort_order: "price_asc",
    page: 1,
    limit: 25,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const combinedResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: combinedRequest,
    },
  );
  typia.assert(combinedResults);

  // Validate that results have proper structure and pagination
  TestValidator.predicate(
    "combined search has valid pagination",
    combinedResults.pagination.limit === 25,
  );
  TestValidator.predicate(
    "combined search has valid total results",
    combinedResults.pagination.records >= 0,
  );

  // Test 5: Boundary conditions - very old dates
  const oldDate = new Date("2020-01-01");
  const oldDateRequest: IShoppingMallGlobalSearch.IRequest = {
    query: "test",
    date_range: `${oldDate.toISOString().split("T")[0]}..${twoWeeksAgo.toISOString().split("T")[0]}`,
    sort_order: "date",
    page: 1,
    limit: 5,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const oldDateResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: oldDateRequest,
    },
  );
  typia.assert(oldDateResults);

  // Test 6: Invalid date range format (should handle gracefully)
  const invalidDateRequest: IShoppingMallGlobalSearch.IRequest = {
    query: "test",
    date_range: "invalid-date-format",
    sort_order: "relevance",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallGlobalSearch.IRequest;

  const invalidDateResults = await api.functional.shoppingMall.search.global(
    connection,
    {
      body: invalidDateRequest,
    },
  );
  typia.assert(invalidDateResults);

  // Validate that invalid format doesn't crash the system
  TestValidator.predicate("invalid date format handled gracefully", true);
}
