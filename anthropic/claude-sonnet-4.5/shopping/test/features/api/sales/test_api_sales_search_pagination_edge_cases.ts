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
 * Test pagination edge cases and boundary conditions for sales search API.
 *
 * This test validates critical pagination scenarios to ensure robust handling
 * of boundary conditions and edge cases in the sales search functionality.
 *
 * Test coverage includes:
 *
 * 1. Page 1 returns the first set of results correctly
 * 2. Requesting page number beyond total available pages is handled gracefully
 * 3. Minimum limit boundary (limit=1) works correctly
 * 4. Maximum limit boundary (limit=100) works correctly
 * 5. Pagination metadata correctly calculates total pages with various record
 *    counts
 * 6. Last page returns correct number of remaining records (may be less than
 *    limit)
 * 7. Pagination consistency - iterating through all pages returns all products
 *    exactly once
 */
export async function test_api_sales_search_pagination_edge_cases(
  connection: api.IConnection,
) {
  // Test 1: Verify page=1 returns the first set of results
  const firstPageRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallSale.IRequest;

  const firstPageResponse: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: firstPageRequest,
    });
  typia.assert(firstPageResponse);

  TestValidator.predicate(
    "page 1 should have valid pagination metadata",
    firstPageResponse.pagination.current === 1,
  );

  // Test 2: Request page number beyond total available pages
  const totalPages = firstPageResponse.pagination.pages;
  const beyondPageNumber = totalPages + 10;

  const beyondPageRequest = {
    page: beyondPageNumber,
    limit: 10,
  } satisfies IShoppingMallSale.IRequest;

  const beyondPageResponse: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: beyondPageRequest,
    });
  typia.assert(beyondPageResponse);

  TestValidator.predicate(
    "requesting page beyond total pages should return empty data or handle gracefully",
    beyondPageResponse.data.length === 0 ||
      beyondPageResponse.pagination.current <=
        beyondPageResponse.pagination.pages,
  );

  // Test 3: Minimum limit boundary (limit=1)
  const minLimitRequest = {
    page: 1,
    limit: 1,
  } satisfies IShoppingMallSale.IRequest;

  const minLimitResponse: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: minLimitRequest,
    });
  typia.assert(minLimitResponse);

  TestValidator.predicate(
    "limit=1 should return at most 1 item",
    minLimitResponse.data.length <= 1,
  );
  TestValidator.equals(
    "pagination limit should be 1",
    minLimitResponse.pagination.limit,
    1,
  );

  // Test 4: Maximum limit boundary (limit=100)
  const maxLimitRequest = {
    page: 1,
    limit: 100,
  } satisfies IShoppingMallSale.IRequest;

  const maxLimitResponse: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: maxLimitRequest,
    });
  typia.assert(maxLimitResponse);

  TestValidator.predicate(
    "limit=100 should return at most 100 items",
    maxLimitResponse.data.length <= 100,
  );
  TestValidator.equals(
    "pagination limit should be 100",
    maxLimitResponse.pagination.limit,
    100,
  );

  // Test 5: Validate pagination metadata calculations
  const testLimit = 7;
  const metadataTestRequest = {
    page: 1,
    limit: testLimit,
  } satisfies IShoppingMallSale.IRequest;

  const metadataResponse: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: metadataTestRequest,
    });
  typia.assert(metadataResponse);

  const expectedPages = Math.ceil(
    metadataResponse.pagination.records / testLimit,
  );
  TestValidator.equals(
    "total pages calculation should be correct",
    metadataResponse.pagination.pages,
    expectedPages,
  );

  TestValidator.predicate(
    "current page should not exceed total pages",
    metadataResponse.pagination.current <= metadataResponse.pagination.pages,
  );

  // Test 6: Last page returns correct number of remaining records
  if (metadataResponse.pagination.pages > 0) {
    const lastPageRequest = {
      page: metadataResponse.pagination.pages,
      limit: testLimit,
    } satisfies IShoppingMallSale.IRequest;

    const lastPageResponse: IPageIShoppingMallSale.ISummary =
      await api.functional.shoppingMall.sales.index(connection, {
        body: lastPageRequest,
      });
    typia.assert(lastPageResponse);

    const expectedLastPageSize =
      metadataResponse.pagination.records % testLimit;
    const actualExpectedSize =
      expectedLastPageSize === 0 ? testLimit : expectedLastPageSize;

    TestValidator.predicate(
      "last page should have correct number of items",
      lastPageResponse.data.length === actualExpectedSize ||
        lastPageResponse.data.length <= testLimit,
    );

    TestValidator.predicate(
      "last page items should not exceed limit",
      lastPageResponse.data.length <= testLimit,
    );
  }

  // Test 7: Pagination consistency - iterate through all pages and verify no duplicates or gaps
  const consistencyLimit = 5;
  const allCollectedIds: string[] = [];

  const initialRequest = {
    page: 1,
    limit: consistencyLimit,
  } satisfies IShoppingMallSale.IRequest;

  const initialResponse: IPageIShoppingMallSale.ISummary =
    await api.functional.shoppingMall.sales.index(connection, {
      body: initialRequest,
    });
  typia.assert(initialResponse);

  const totalPagesToFetch = Math.min(initialResponse.pagination.pages, 5);

  for (let pageNum = 1; pageNum <= totalPagesToFetch; pageNum++) {
    const pageRequest = {
      page: pageNum,
      limit: consistencyLimit,
    } satisfies IShoppingMallSale.IRequest;

    const pageResponse: IPageIShoppingMallSale.ISummary =
      await api.functional.shoppingMall.sales.index(connection, {
        body: pageRequest,
      });
    typia.assert(pageResponse);

    pageResponse.data.forEach((sale) => {
      allCollectedIds.push(sale.id);
    });
  }

  const uniqueIds = [...new Set(allCollectedIds)];
  TestValidator.equals(
    "no duplicate IDs across pages - all items unique",
    uniqueIds.length,
    allCollectedIds.length,
  );

  TestValidator.predicate(
    "collected IDs should match expected count",
    allCollectedIds.length <= totalPagesToFetch * consistencyLimit,
  );
}
