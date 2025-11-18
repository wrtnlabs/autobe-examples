import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate pagination bounds and empty-result behavior of category search.
 *
 * This test exercises the PATCH /shoppingMall/categories endpoint to ensure it
 * behaves correctly when:
 *
 * - Requesting a page index beyond the last available page.
 * - Applying filters that yield no matching categories.
 *
 * Business expectations:
 *
 * 1. Out-of-range `page` requests must not throw errors but return an empty `data`
 *    array with a consistent `pagination` structure.
 * 2. Non-matching filter combinations (e.g., random search keyword) must result in
 *    an empty `data` array with `pagination.records` reflecting zero records,
 *    without changing public access semantics.
 *
 * Steps:
 *
 * 1. Call PATCH /shoppingMall/categories with a basic request (no filters, default
 *    page/limit) and capture pagination summary.
 * 2. Compute an out-of-range page index (e.g., pages + 1 when pages > 0, otherwise
 *    a large page like 9999) and request that page.
 * 3. Assert that the response shape is valid, `data` is empty, and pagination
 *    values are non-negative and consistent, and that total record count does
 *    not change.
 * 4. Build a highly unlikely search filter using a random high-entropy search
 *    string and sensible page/limit values, then call the endpoint.
 * 5. Assert that this filtered call also returns an empty `data` array and a
 *    coherent pagination block where `records` is zero.
 */
export async function test_api_category_search_pagination_bounds_and_empty_results(
  connection: api.IConnection,
) {
  // 1. Initial search to get current pagination baseline
  const initialRequestBody = {
    // Let server default page/limit by omitting them via undefined
    page: undefined,
    limit: undefined,
    parent_id: null,
    status: null,
    is_leaf: null,
    search: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallCategory.IRequest;

  const initialPage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: initialRequestBody,
    });
  typia.assert(initialPage);

  const initialPagination: IPage.IPagination = initialPage.pagination;
  TestValidator.predicate(
    "initial pagination current is non-negative",
    () => initialPagination.current >= 0,
  );
  TestValidator.predicate(
    "initial pagination limit is non-negative",
    () => initialPagination.limit >= 0,
  );
  TestValidator.predicate(
    "initial pagination records is non-negative",
    () => initialPagination.records >= 0,
  );
  TestValidator.predicate(
    "initial pagination pages is non-negative",
    () => initialPagination.pages >= 0,
  );

  // 2. Compute out-of-range page index based on current pages
  const currentPages: number & tags.Type<"int32"> & tags.Minimum<0> =
    initialPagination.pages;

  // If there are already pages, request the next page beyond the last.
  // If there are zero pages, use a large 1-based page index.
  const outOfRangePage: number & tags.Type<"int32"> = (currentPages > 0
    ? currentPages + 1
    : 9999) satisfies number as number;

  const outOfRangeLimit: number & tags.Type<"int32"> =
    (initialPagination.limit > 0
      ? initialPagination.limit
      : 20) satisfies number as number;

  const outOfRangeRequestBody = {
    page: outOfRangePage,
    limit: outOfRangeLimit,
    parent_id: null,
    status: null,
    is_leaf: null,
    search: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallCategory.IRequest;

  const outOfRangePageResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: outOfRangeRequestBody,
    });
  typia.assert(outOfRangePageResult);

  // 3. Validate out-of-range pagination behavior
  TestValidator.equals(
    "out-of-range request returns empty data",
    outOfRangePageResult.data.length,
    0,
  );

  const outOfRangePagination: IPage.IPagination =
    outOfRangePageResult.pagination;
  TestValidator.predicate(
    "out-of-range pagination current is non-negative",
    () => outOfRangePagination.current >= 0,
  );
  TestValidator.predicate(
    "out-of-range pagination limit is non-negative",
    () => outOfRangePagination.limit >= 0,
  );
  TestValidator.predicate(
    "out-of-range pagination records is non-negative",
    () => outOfRangePagination.records >= 0,
  );
  TestValidator.predicate(
    "out-of-range pagination pages is non-negative",
    () => outOfRangePagination.pages >= 0,
  );

  // Even if the server normalizes the page index, it should not reduce the
  // total number of records, because no data has been mutated.
  TestValidator.equals(
    "out-of-range pagination records stays consistent with initial",
    outOfRangePagination.records,
    initialPagination.records,
  );

  // 4. Build a filter combination that is unlikely to match any category
  const randomSearchToken: string = RandomGenerator.alphabets(32);

  const emptyFilterRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    parent_id: null,
    status: null,
    is_leaf: null,
    search: randomSearchToken,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallCategory.IRequest;

  const filteredEmptyResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: emptyFilterRequestBody,
    });
  typia.assert(filteredEmptyResult);

  // 5. Validate empty-result behavior for non-matching filters
  TestValidator.equals(
    "filtered empty-result search returns empty data",
    filteredEmptyResult.data.length,
    0,
  );

  const filteredPagination: IPage.IPagination = filteredEmptyResult.pagination;

  TestValidator.predicate(
    "filtered pagination current is non-negative",
    () => filteredPagination.current >= 0,
  );
  TestValidator.predicate(
    "filtered pagination limit is non-negative",
    () => filteredPagination.limit >= 0,
  );
  TestValidator.predicate(
    "filtered pagination records is non-negative",
    () => filteredPagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered pagination pages is non-negative",
    () => filteredPagination.pages >= 0,
  );

  // If no records match, records should be zero, which is the strongest
  // invariant we can assert without over-constraining server behavior on
  // `pages` when there are no records.
  TestValidator.equals(
    "filtered pagination records is zero when data is empty",
    filteredPagination.records,
    0,
  );
}
