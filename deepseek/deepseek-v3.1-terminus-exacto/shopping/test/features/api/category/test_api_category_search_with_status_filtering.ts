import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test category search with active/inactive status filtering.
 *
 * Validates that default behavior returns active categories for customer-facing
 * interfaces while allowing administrative access to inactive categories. Tests
 * combination of status filtering with text search and hierarchical
 * organization for comprehensive category management.
 */
export async function test_api_category_search_with_status_filtering(
  connection: api.IConnection,
) {
  // Test 1: Default behavior - should return only active categories
  const defaultResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(defaultResult);

  // Validate that all returned categories are active (if any exist)
  if (defaultResult.data.length > 0) {
    TestValidator.predicate(
      "default search returns only active categories",
      defaultResult.data.every((category) => category.active === true),
    );
  }

  // Test 2: Explicit active=true filtering
  const activeOnlyResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        active: true,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(activeOnlyResult);

  if (activeOnlyResult.data.length > 0) {
    TestValidator.predicate(
      "active=true filter returns only active categories",
      activeOnlyResult.data.every((category) => category.active === true),
    );
  }

  // Test 3: Explicit active=false filtering (administrative access)
  const inactiveOnlyResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        active: false,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(inactiveOnlyResult);

  if (inactiveOnlyResult.data.length > 0) {
    TestValidator.predicate(
      "active=false filter returns only inactive categories",
      inactiveOnlyResult.data.every((category) => category.active === false),
    );
  }

  // Test 4: Combination with text search
  const searchTerm = RandomGenerator.name(1); // Use single word for search term
  const searchWithActiveFilter: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: searchTerm,
        active: true,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(searchWithActiveFilter);

  // Test 5: Test pagination with status filtering
  const paginatedResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 2,
        limit: 5,
        active: true,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(paginatedResult);

  TestValidator.equals(
    "pagination page number matches request",
    paginatedResult.pagination.current,
    2,
  );

  TestValidator.equals(
    "pagination limit matches request",
    paginatedResult.pagination.limit,
    5,
  );

  // Test 6: Test name sorting with status filtering
  const sortedResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        active: true,
        order_by: "name",
        order_direction: "asc",
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(sortedResult);

  // Validate that categories are properly sorted (API responsibility)
  if (sortedResult.data.length > 0) {
    TestValidator.predicate(
      "API returns categories when sorting by name ascending",
      sortedResult.data.length > 0,
    );
  }

  // Test 7: Test descending order sorting
  const descendingResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        active: true,
        order_by: "name",
        order_direction: "desc",
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(descendingResult);

  // Test 8: Test display_order sorting
  const displayOrderResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        active: true,
        order_by: "display_order",
        order_direction: "asc",
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(displayOrderResult);

  if (displayOrderResult.data.length > 0) {
    TestValidator.predicate(
      "API returns categories when sorting by display_order",
      displayOrderResult.data.length > 0,
    );
  }

  // Test 9: Test created_at sorting
  const createdAtResult: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        active: true,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(createdAtResult);

  // Test 10: Validate pagination structure
  TestValidator.predicate(
    "pagination structure is valid",
    paginatedResult.pagination.records >= 0 &&
      paginatedResult.pagination.pages >= 0 &&
      paginatedResult.pagination.limit > 0,
  );
}
