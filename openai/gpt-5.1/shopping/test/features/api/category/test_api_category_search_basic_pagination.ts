import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Basic public category search pagination behavior.
 *
 * This test validates that the public PATCH /shoppingMall/categories endpoint
 * correctly handles default and explicit pagination parameters without any
 * authentication, and that pagination metadata is consistent between calls.
 *
 * Scenario:
 *
 * 1. Call the endpoint with an empty IShoppingMallCategory.IRequest body (default
 *    pagination, page 1) and verify:
 *
 *    - The response conforms to IPageIShoppingMallCategory.ISummary.
 *    - Pagination.current === 1.
 *    - Pagination.limit > 0.
 *    - Data.length is within [0, pagination.limit].
 * 2. Call the endpoint again with explicit page=2, limit=10 and verify:
 *
 *    - Pagination.current === 2.
 *    - Pagination.limit === 10.
 *    - Pagination.records and pagination.pages are the same as in the first call
 *         (identical filter conditions, only pagination differs).
 * 3. When there are enough records for multiple pages, verify that the data slice
 *    of page 1 and page 2 are different to confirm basic pagination behavior.
 *    When records are too few, skip this slice comparison but still validate
 *    structure and metadata.
 */
export async function test_api_category_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Call with empty request body (default pagination)
  const firstPage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {} satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert<IPageIShoppingMallCategory.ISummary>(firstPage);

  const firstPagination = firstPage.pagination;

  // Basic sanity checks on default pagination
  TestValidator.equals(
    "default first page should be page 1",
    firstPagination.current,
    1,
  );
  TestValidator.predicate(
    "default limit should be positive",
    firstPagination.limit > 0,
  );
  TestValidator.predicate(
    "records should be non-negative",
    firstPagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    firstPagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page data length within limit",
    firstPage.data.length <= firstPagination.limit,
  );

  // 2. Call with explicit pagination (page 2, limit 10)
  const secondPage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert<IPageIShoppingMallCategory.ISummary>(secondPage);

  const secondPagination = secondPage.pagination;

  // Validate explicit pagination metadata
  TestValidator.equals(
    "second call current page should be 2",
    secondPagination.current,
    2,
  );
  TestValidator.equals(
    "second call limit should be 10",
    secondPagination.limit,
    10,
  );

  // Records/pages consistency between first and second call
  TestValidator.equals(
    "records count must be consistent across identical filters",
    secondPagination.records,
    firstPagination.records,
  );
  TestValidator.equals(
    "pages count must be consistent across identical filters",
    secondPagination.pages,
    firstPagination.pages,
  );

  // 3. Slice comparison when enough records exist for multiple pages
  if (firstPagination.records > firstPagination.limit) {
    // When there are multiple pages, page 1 and page 2 slices should differ.
    TestValidator.notEquals(
      "page 1 and page 2 data slices should differ when multiple pages exist",
      firstPage.data,
      secondPage.data,
    );
  }
}
