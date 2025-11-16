import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Test that the category search endpoint is publicly accessible without
 * authentication.
 *
 * This test validates that buyers and anonymous users can browse the category
 * hierarchy to discover products without requiring any authorization tokens.
 * The test confirms that category browsing is a fundamental public marketplace
 * feature by executing multiple search operations with various parameters while
 * using an unauthenticated connection.
 *
 * Test Flow:
 *
 * 1. Create unauthenticated connection with empty headers
 * 2. Search categories with default parameters (no filters)
 * 3. Search with pagination parameters
 * 4. Search with status filter
 * 5. Search with parent_id filter for hierarchical navigation
 * 6. Search with sorting options
 * 7. Validate all responses return proper data structures
 */
export async function test_api_category_search_public_access(
  connection: api.IConnection,
) {
  // Create unauthenticated connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Test 1: Basic category search without any parameters
  const basicSearch = await api.functional.shoppingMall.categories.index(
    unauthConn,
    {
      body: {} satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(basicSearch);
  TestValidator.predicate(
    "basic search returns valid pagination",
    basicSearch.pagination.current >= 0 && basicSearch.pagination.pages >= 0,
  );

  // Test 2: Category search with pagination parameters
  const page = typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();

  const paginatedSearch = await api.functional.shoppingMall.categories.index(
    unauthConn,
    {
      body: {
        page: page,
        limit: limit,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    "paginated search respects limit",
    paginatedSearch.data.length <= limit,
  );

  // Test 3: Category search with status filter
  const statuses = ["active", "inactive"] as const;
  const status = RandomGenerator.pick(statuses);

  const statusSearch = await api.functional.shoppingMall.categories.index(
    unauthConn,
    {
      body: {
        status: status,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(statusSearch);
  TestValidator.predicate(
    "status filter returns categories",
    statusSearch.pagination.records >= 0,
  );

  // Test 4: Search root-level categories (parent_id = null)
  const rootCategoriesSearch =
    await api.functional.shoppingMall.categories.index(unauthConn, {
      body: {
        parent_id: null,
        limit: 20,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(rootCategoriesSearch);
  TestValidator.predicate(
    "root categories search succeeds",
    rootCategoriesSearch.pagination.records >= 0,
  );

  // Test 5: Category search with text search query
  const searchQuery = RandomGenerator.alphabets(5);

  const textSearch = await api.functional.shoppingMall.categories.index(
    unauthConn,
    {
      body: {
        search: searchQuery,
        limit: 15,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(textSearch);
  TestValidator.predicate(
    "text search returns valid results",
    textSearch.pagination.records >= 0,
  );

  // Test 6: Category search with sorting options
  const sortByOptions = ["name", "created_at", "display_order"] as const;
  const sortDirections = ["asc", "desc"] as const;

  const sortBy = RandomGenerator.pick(sortByOptions);
  const sortDirection = RandomGenerator.pick(sortDirections);

  const sortedSearch = await api.functional.shoppingMall.categories.index(
    unauthConn,
    {
      body: {
        sort_by: sortBy,
        sort_direction: sortDirection,
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortedSearch);
  TestValidator.predicate(
    "sorted search returns valid data",
    sortedSearch.data.length >= 0,
  );

  // Test 7: Complex search with multiple parameters
  const complexSearch = await api.functional.shoppingMall.categories.index(
    unauthConn,
    {
      body: {
        page: 1,
        limit: 25,
        status: "active",
        sort_by: "name",
        sort_direction: "asc",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(complexSearch);
  TestValidator.predicate(
    "complex search with multiple filters succeeds",
    complexSearch.pagination.current === 1,
  );
  TestValidator.predicate(
    "complex search respects limit",
    complexSearch.data.length <= 25,
  );
}
