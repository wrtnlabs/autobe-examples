import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate combined filtering of ShoppingMall categories by lifecycle status
 * and leaf flag.
 *
 * Business context: The PATCH /shoppingMall/categories endpoint provides a
 * read-only search interface over the global shopping_mall_categories taxonomy.
 * Clients can filter by lifecycle status (e.g., `active`, `hidden`,
 * `deprecated`) and by whether a category is a leaf node. This test ensures
 * that when both filters are applied together, all returned categories respect
 * those constraints and that relaxing one filter still preserves the remaining
 * condition.
 *
 * Step-by-step process:
 *
 * 1. Call PATCH /shoppingMall/categories with a body that sets
 *
 *    - Page=1, limit=20
 *    - Status="active"
 *    - Is_leaf=true
 *    - All other optional filters explicitly null.
 * 2. Assert that the response matches IPageIShoppingMallCategory.ISummary and that
 *    pagination metadata is non-negative.
 * 3. For every returned category, assert that
 *
 *    - Category.status is exactly "active" and
 *    - Category.is_leaf is true.
 * 4. If at least one category was returned, call the same endpoint again with
 *    is_leaf relaxed to null while keeping status="active" and verify that all
 *    returned categories still have status="active".
 *
 * This validates that the status and is_leaf filters work individually and in
 * combination for the subset of data returned by the API, without relying on
 * any mutation APIs or assumptions about the full dataset.
 */
export async function test_api_category_search_filter_by_status_and_leaf_flag(
  connection: api.IConnection,
) {
  // 1. Request categories filtered by status="active" and is_leaf=true
  const requestBody = {
    page: 1 satisfies number,
    limit: 20 satisfies number,
    parent_id: null,
    status: "active",
    is_leaf: true,
    search: null,
    order_by: null,
    order_direction: null,
  } satisfies IShoppingMallCategory.IRequest;

  const page: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: requestBody,
    });
  typia.assert<IPageIShoppingMallCategory.ISummary>(page);

  // 2. Validate pagination metadata
  const pagination: IPage.IPagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "pagination current page is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );

  // 3. Validate that all returned categories satisfy the filters
  for (const category of page.data) {
    typia.assert<IShoppingMallCategory.ISummary>(category);

    TestValidator.equals(
      "category status must match filter 'active'",
      category.status,
      "active",
    );
    TestValidator.predicate(
      "category is_leaf must be true when filtered by is_leaf=true",
      category.is_leaf === true,
    );
  }

  // 4. Optional secondary call: relax one filter and ensure consistency of remaining condition
  if (page.data.length > 0) {
    // Relax is_leaf filter but keep status="active"
    const relaxedBody = {
      page: 1 satisfies number,
      limit: 20 satisfies number,
      parent_id: null,
      status: "active",
      is_leaf: null,
      search: null,
      order_by: null,
      order_direction: null,
    } satisfies IShoppingMallCategory.IRequest;

    const relaxedPage: IPageIShoppingMallCategory.ISummary =
      await api.functional.shoppingMall.categories.index(connection, {
        body: relaxedBody,
      });
    typia.assert<IPageIShoppingMallCategory.ISummary>(relaxedPage);

    for (const category of relaxedPage.data) {
      typia.assert<IShoppingMallCategory.ISummary>(category);

      TestValidator.equals(
        "relaxed filter still enforces status 'active'",
        category.status,
        "active",
      );
    }
  }
}
