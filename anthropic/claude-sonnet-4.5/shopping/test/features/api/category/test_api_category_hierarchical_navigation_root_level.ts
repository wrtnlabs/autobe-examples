import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test retrieving only root-level categories by setting parent_id to null
 * explicitly.
 *
 * This test validates the ability to build hierarchical category trees starting
 * from the root level by filtering categories with no parent. The test queries
 * for root-level categories using parent_id: null and verifies that only
 * categories without parents are returned, ensuring proper hierarchical
 * navigation for building category menus.
 *
 * Test workflow:
 *
 * 1. Query categories with parent_id set to null to get only root-level categories
 * 2. Validate the response structure using typia.assert
 * 3. Verify all returned categories have parent_id as null (root level)
 * 4. Confirm subcategories are excluded from results
 */
export async function test_api_category_hierarchical_navigation_root_level(
  connection: api.IConnection,
) {
  const requestBody = {
    page: 1,
    limit: 50,
    parent_id: null,
  } satisfies IShoppingMallCategory.IRequest;

  const response: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: requestBody,
    });

  typia.assert(response);

  TestValidator.predicate(
    "pagination current page should be 1",
    response.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    response.pagination.limit === 50,
  );

  TestValidator.predicate(
    "all returned categories must be root level with null parent_id",
    response.data.every(
      (category) =>
        category.parent_id === null || category.parent_id === undefined,
    ),
  );
}
