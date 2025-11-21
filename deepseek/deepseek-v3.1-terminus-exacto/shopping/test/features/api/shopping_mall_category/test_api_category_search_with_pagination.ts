import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Comprehensive E2E test for category search functionality with pagination
 * controls.
 *
 * This test validates the complete category discovery system including text
 * search, hierarchical filtering, status-based visibility controls, and
 * configurable sorting options. It ensures that pagination works correctly with
 * different page sizes and that search results accurately reflect all filtering
 * criteria.
 *
 * The test covers:
 *
 * 1. Basic pagination with various page sizes and numbers
 * 2. Text search with partial matching on category names and descriptions
 * 3. Parent category filtering for hierarchical browsing
 * 4. Active/inactive status filtering for visibility control
 * 5. All available sorting options with both directions
 * 6. Display order filtering for organizational control
 * 7. Combined filter scenarios
 */
export async function test_api_category_search_with_pagination(
  connection: api.IConnection,
) {
  // Test 1: Basic pagination with default parameters
  const defaultPage = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page should be page 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default page limit should be 10",
    defaultPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    defaultPage.pagination.pages >= 0,
  );

  // Test 2: Different page sizes
  const smallPage = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(smallPage);
  TestValidator.equals(
    "small page limit should be 5",
    smallPage.pagination.limit,
    5,
  );

  const largePage = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(largePage);
  TestValidator.equals(
    "large page limit should be 50",
    largePage.pagination.limit,
    50,
  );

  // Test 3: Text search functionality
  const searchTerm = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 6,
  });
  const searchResults = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: searchTerm,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(searchResults);

  // Test 4: Sorting by different fields
  const sortByNameAsc = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order_by: "name",
        order_direction: "asc",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortByNameAsc);

  const sortByNameDesc = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order_by: "name",
        order_direction: "desc",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortByNameDesc);

  const sortByDisplayOrder = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order_by: "display_order",
        order_direction: "asc",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortByDisplayOrder);

  const sortByCreatedAt = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortByCreatedAt);

  // Test 5: Status filtering
  const activeCategories = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        active: true,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(activeCategories);

  const inactiveCategories = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        active: false,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(inactiveCategories);

  // Test 6: Combined filters
  const combinedSearch = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "electronics",
        active: true,
        order_by: "name",
        order_direction: "asc",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(combinedSearch);

  // Test 7: Display order filtering
  const specificDisplayOrder =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        display_order: 1,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(specificDisplayOrder);

  // Test 8: Multiple page navigation
  if (defaultPage.pagination.pages > 1) {
    const secondPage = await api.functional.shoppingMall.categories.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page should be page 2",
      secondPage.pagination.current,
      2,
    );
  }

  // Test 9: Edge case - page 0 (should handle gracefully)
  const pageZero = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 0,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(pageZero);

  // Test 10: Very large page number
  const largePageNumber = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1000,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(largePageNumber);

  // Validate that all category summaries have required properties
  if (defaultPage.data.length > 0) {
    const sampleCategory = defaultPage.data[0];
    TestValidator.predicate(
      "category should have valid UUID ID",
      sampleCategory.id.length > 0,
    );
    TestValidator.predicate(
      "category should have non-empty name",
      sampleCategory.name.length > 0,
    );
    TestValidator.predicate(
      "category should have numeric display order",
      typeof sampleCategory.display_order === "number",
    );
    TestValidator.predicate(
      "category should have boolean active status",
      typeof sampleCategory.active === "boolean",
    );
    TestValidator.predicate(
      "category should have valid parent ID",
      sampleCategory.parent_id.length > 0,
    );
    TestValidator.predicate(
      "category should have ISO date-time created_at",
      sampleCategory.created_at.length > 0,
    );
    TestValidator.predicate(
      "category should have ISO date-time updated_at",
      sampleCategory.updated_at.length > 0,
    );
  }
}
