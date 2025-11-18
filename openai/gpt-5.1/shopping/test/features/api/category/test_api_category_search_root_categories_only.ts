import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Verify that category search can retrieve only root-level categories using
 * `parent_id = null`, while preserving normal pagination and sorting.
 *
 * Business intent:
 *
 * - When a client sends `parent_id` explicitly as `null` in
 *   `IShoppingMallCategory.IRequest`, the server should interpret this as "root
 *   categories only" (categories without a parent).
 * - Other filters like `status`, `is_leaf`, and `search` are left unconstrained
 *   (null/undefined) so they do not affect this behavior.
 * - Pagination and ordering (via `page`, `limit`, `order_by`, `order_direction`)
 *   must still work normally under this filter.
 *
 * Steps:
 *
 * 1. Build a request body with:
 *
 *    - `parent_id = null` to target root categories only.
 *    - `page = 1`, `limit = 20` for a small, deterministic page.
 *    - `order_by = "sort_order"`, `order_direction = "asc"` to get a reproducible
 *         ordering suitable for sortedness checks.
 * 2. Call PATCH /shoppingMall/categories through
 *    `api.functional.shoppingMall.categories.index`.
 * 3. Assert the response structure using `typia.assert` against
 *    `IPageIShoppingMallCategory.ISummary` and `IPage.IPagination`.
 * 4. For every returned category summary, assert that `parent_id` is either `null`
 *    or `undefined`, guaranteeing no non-root categories appear in the filtered
 *    page.
 * 5. When multiple categories are returned, assert that `sort_order` values are
 *    non-decreasing, confirming that ordering by `sort_order` ascending is
 *    respected even when filtering by root categories.
 */
export async function test_api_category_search_root_categories_only(
  connection: api.IConnection,
) {
  // 1. Build request body that filters to root categories only.
  // - parent_id explicitly null to mean "root categories"
  // - other filters left null so they do not constrain results
  // - use small page/limit and deterministic order to allow ordering checks
  const requestBody = {
    page: 1,
    limit: 20,
    parent_id: null,
    status: null,
    is_leaf: null,
    search: null,
    order_by: "sort_order",
    order_direction: "asc",
  } satisfies IShoppingMallCategory.IRequest;

  // 2. Call the PATCH /shoppingMall/categories endpoint.
  const page: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: requestBody,
    });

  // 3. Type-level assertion of the response shape.
  typia.assert<IPageIShoppingMallCategory.ISummary>(page);

  // 4. Basic pagination sanity checks.
  const pagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "current page index should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "page limit should be positive",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    pagination.pages >= 0,
  );

  const categories = page.data;

  // 5. Assert every returned category is a root category (no parent_id).
  for (const category of categories) {
    typia.assert<IShoppingMallCategory.ISummary>(category);

    TestValidator.predicate(
      "category parent_id must be null for root category filter",
      category.parent_id === null || category.parent_id === undefined,
    );
  }

  // 6. Assert the categories are sorted by sort_order ascending when multiple
  //    results are present.
  for (let i = 1; i < categories.length; ++i) {
    const prev = categories[i - 1];
    const curr = categories[i];

    TestValidator.predicate(
      "categories must be sorted by sort_order ascending when order_by=sort_order&order_direction=asc",
      prev.sort_order <= curr.sort_order,
    );
  }
}
