import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test product sales search behavior when no products match the search
 * criteria.
 *
 * This test validates that the sales search API properly handles empty result
 * scenarios by returning well-formed responses with empty data arrays and
 * correct pagination metadata. Multiple filtering scenarios are tested to
 * ensure consistent behavior across different types of queries that yield no
 * results.
 *
 * Test scenarios include:
 *
 * 1. Search with non-existent product name
 * 2. Filter with impossible price range (minimum exceeds all realistic prices)
 * 3. Search with non-existent brand name
 * 4. Filter by non-existent category ID
 * 5. Combine multiple restrictive filters
 *
 * Each scenario validates:
 *
 * - Response structure matches IPageIShoppingMallSale.ISummary
 * - Data array is empty
 * - Pagination metadata correctly reflects zero results (records=0, pages=0)
 * - Response remains valid JSON Schema compliant
 */
export async function test_api_sales_search_empty_results(
  connection: api.IConnection,
) {
  // Test 1: Search with non-existent product name
  const nonExistentProductName =
    RandomGenerator.alphaNumeric(20) + "_NONEXISTENT_PRODUCT";
  const searchByNameResult = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        search: nonExistentProductName,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(searchByNameResult);
  TestValidator.equals(
    "search by non-existent name returns empty data",
    searchByNameResult.data,
    [],
  );
  TestValidator.equals(
    "search by non-existent name has zero records",
    searchByNameResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "search by non-existent name has zero pages",
    searchByNameResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    searchByNameResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    searchByNameResult.pagination.limit,
    20,
  );

  // Test 2: Filter with impossible price range (extremely high minimum price)
  const impossibleMinPrice = 999999999;
  const priceRangeResult = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        min_price: impossibleMinPrice,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(priceRangeResult);
  TestValidator.equals(
    "impossible price range returns empty data",
    priceRangeResult.data,
    [],
  );
  TestValidator.equals(
    "impossible price range has zero records",
    priceRangeResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "impossible price range has zero pages",
    priceRangeResult.pagination.pages,
    0,
  );

  // Test 3: Search with non-existent brand name
  const nonExistentBrand = RandomGenerator.alphaNumeric(15) + "_FAKE_BRAND_XYZ";
  const brandSearchResult = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        brand: nonExistentBrand,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(brandSearchResult);
  TestValidator.equals(
    "non-existent brand returns empty data",
    brandSearchResult.data,
    [],
  );
  TestValidator.equals(
    "non-existent brand has zero records",
    brandSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent brand has zero pages",
    brandSearchResult.pagination.pages,
    0,
  );

  // Test 4: Filter by non-existent category ID
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  const categoryFilterResult = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        category_id: nonExistentCategoryId,
        page: 1,
        limit: 15,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(categoryFilterResult);
  TestValidator.equals(
    "non-existent category returns empty data",
    categoryFilterResult.data,
    [],
  );
  TestValidator.equals(
    "non-existent category has zero records",
    categoryFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent category has zero pages",
    categoryFilterResult.pagination.pages,
    0,
  );

  // Test 5: Combine multiple restrictive filters (all guaranteed to exclude products)
  const combinedFiltersResult = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        search: RandomGenerator.alphaNumeric(25) + "_IMPOSSIBLE_SEARCH",
        brand: RandomGenerator.alphaNumeric(20) + "_NONEXISTENT_BRAND",
        min_price: 888888888,
        max_price: 999999999,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        limit: 50,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(combinedFiltersResult);
  TestValidator.equals(
    "combined restrictive filters return empty data",
    combinedFiltersResult.data,
    [],
  );
  TestValidator.equals(
    "combined filters have zero records",
    combinedFiltersResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filters have zero pages",
    combinedFiltersResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "combined filters pagination current is 1",
    combinedFiltersResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filters pagination limit is 50",
    combinedFiltersResult.pagination.limit,
    50,
  );

  // Test 6: Search with minimum length query that won't match
  const minLengthSearch = RandomGenerator.alphabets(2);
  const minSearchResult = await api.functional.shoppingMall.sales.index(
    connection,
    {
      body: {
        search: minLengthSearch + "_NOMATCH",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    },
  );
  typia.assert(minSearchResult);
  TestValidator.equals(
    "minimum length search with no match returns empty data",
    minSearchResult.data,
    [],
  );
  TestValidator.equals(
    "minimum length search has zero records",
    minSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "minimum length search has zero pages",
    minSearchResult.pagination.pages,
    0,
  );
}
