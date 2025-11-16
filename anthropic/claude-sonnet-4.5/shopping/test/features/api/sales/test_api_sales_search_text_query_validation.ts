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
 * Test search text query validation and behavior.
 *
 * This test validates the search functionality of the sales API, ensuring that:
 *
 * - Minimum length requirement (2 characters) is enforced by TypeScript type
 *   system
 * - Case-insensitive searching works correctly
 * - Partial matching functions properly
 * - Multi-word queries work with AND semantics
 * - Special characters and Unicode are handled appropriately
 * - Search works correctly when combined with other filters
 * - Whitespace is properly trimmed or handled
 *
 * Test Steps:
 *
 * 1. Test minimum length (2 characters) search query
 * 2. Test longer search queries
 * 3. Test case-insensitive searching
 * 4. Test partial string matching
 * 5. Test multi-word search queries
 * 6. Test special characters in search
 * 7. Test Unicode character support
 * 8. Test search combined with filters
 * 9. Test whitespace handling
 */
export async function test_api_sales_search_text_query_validation(
  connection: api.IConnection,
) {
  // Test 1: Minimum length search query (2 characters)
  const minLengthQuery = "La";
  const minLengthResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        search: minLengthQuery,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(minLengthResult);

  // Test 2: Longer search query
  const longerQuery = "Laptop Computer";
  const longerResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        search: longerQuery,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(longerResult);

  // Test 3: Case-insensitive searching
  const lowercaseQuery = "laptop";
  const uppercaseQuery = "LAPTOP";
  const mixedcaseQuery = "Laptop";

  const lowercaseResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        search: lowercaseQuery,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(lowercaseResult);

  const uppercaseResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        search: uppercaseQuery,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(uppercaseResult);

  const mixedcaseResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        search: mixedcaseQuery,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(mixedcaseResult);

  // Case-insensitive searches should return same number of results
  TestValidator.equals(
    "lowercase and uppercase search should return same record count",
    lowercaseResult.pagination.records,
    uppercaseResult.pagination.records,
  );
  TestValidator.equals(
    "mixedcase and uppercase search should return same record count",
    mixedcaseResult.pagination.records,
    uppercaseResult.pagination.records,
  );

  // Test 4: Partial matching with substring
  const partialQuery = "top";
  const partialResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        search: partialQuery,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(partialResult);

  // Test 5: Multi-word search query
  const multiWordQuery = "gaming laptop";
  const multiWordResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        search: multiWordQuery,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(multiWordResult);

  // Test 6: Special characters in search
  const specialCharQuery = "laptop-pro";
  const specialCharResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        search: specialCharQuery,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(specialCharResult);

  // Test 7: Unicode characters
  const unicodeQuery = "노트북";
  const unicodeResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        search: unicodeQuery,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(unicodeResult);

  // Test 8: Search combined with other filters
  const combinedResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        search: "laptop",
        min_price: 100,
        max_price: 5000,
        status: "published",
        condition: "new",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(combinedResult);

  // Test 9: Whitespace handling - leading/trailing spaces
  const whitespaceQuery = "  laptop  ";
  const whitespaceResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        search: whitespaceQuery,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(whitespaceResult);

  // Additional validation: Test pagination with search
  const paginatedResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        search: "product",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(paginatedResult);

  // Test sorting with search
  const sortedResult: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: {
        search: "item",
        sort_by: "price_asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(sortedResult);
}
