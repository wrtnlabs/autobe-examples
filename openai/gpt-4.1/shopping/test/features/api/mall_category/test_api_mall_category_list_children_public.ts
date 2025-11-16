import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate listing of direct child categories under a specified parent category
 * by its unique name (public endpoint, no authentication required).
 *
 * This test verifies:
 *
 * 1. Response is a valid paginated structure IPageIShoppingMallCategory.ISummary.
 * 2. Only direct children of the specified parent are returned.
 * 3. Exclusion of deactivated/inactive or admin-only categories unless explicitly
 *    filtered for them.
 * 4. Sorting is correct (by sort_order or other fields as requested).
 * 5. Filtering (e.g., by status) applies.
 * 6. Edge case: parent with no children correctly returns an empty data array.
 *
 * Two main validation cases are covered:
 *
 * - Parent known to have several children (should return paginated children as
 *   per filters/sort).
 * - Parent known to have no children (should return a valid empty page result).
 */
export async function test_api_mall_category_list_children_public(
  connection: api.IConnection,
) {
  // Generate a random parent category name
  const parentName: string = RandomGenerator.name(1);
  // 1. Test paginated retrieval (default filter/pagination)
  const page1: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.mallCategories.children.index(
      connection,
      {
        name: parentName,
        body: {} satisfies IShoppingMallCategory.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals(
    "response contains data array",
    Array.isArray(page1.data),
    true,
  );
  TestValidator.equals(
    "response contains pagination object",
    typeof page1.pagination,
    "object",
  );

  // 2. Filtering by status (active only)
  const statusPage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.mallCategories.children.index(
      connection,
      {
        name: parentName,
        body: { status: "active" } satisfies IShoppingMallCategory.IRequest,
      },
    );
  typia.assert(statusPage);
  TestValidator.predicate(
    "all children have active status",
    statusPage.data.every((cat) => cat.status === "active"),
  );

  // 3. Test sort by sort_order descending
  const sortPage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.mallCategories.children.index(
      connection,
      {
        name: parentName,
        body: {
          sort_field: "sort_order",
          sort_order: "desc",
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
  typia.assert(sortPage);
  TestValidator.predicate(
    "sorted by sort_order descending",
    sortPage.data.every(
      (cat, i, arr) => i === 0 || cat.sort_order <= arr[i - 1].sort_order,
    ),
  );

  // 4. Edge case: parent known to have no children (random name)
  const noChildName: string = RandomGenerator.alphaNumeric(12) + "_nochildren";
  const emptyPage: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.mallCategories.children.index(
      connection,
      {
        name: noChildName,
        body: {} satisfies IShoppingMallCategory.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "no children returns empty array",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "pagination object exists in empty result",
    typeof emptyPage.pagination,
    "object",
  );
}
