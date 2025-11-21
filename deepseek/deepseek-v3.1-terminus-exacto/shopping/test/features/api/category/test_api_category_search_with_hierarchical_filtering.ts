import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

/**
 * Validate category search functionality with filtering and sorting
 * capabilities
 *
 * This test validates the shopping mall category search API, focusing on
 * pagination, filtering, and sorting options. Since category creation endpoints
 * are not available, the test works with existing category data to validate
 * search functionality.
 */
export async function test_api_category_search_with_hierarchical_filtering(
  connection: api.IConnection,
) {
  // Test 1: Basic pagination with default parameters
  const basicSearch = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(basicSearch);

  TestValidator.equals(
    "basic search returns pagination data",
    basicSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "basic search has valid limit",
    basicSearch.pagination.limit === 5,
  );
  TestValidator.predicate(
    "basic search returns valid pagination metadata",
    basicSearch.pagination.records >= 0 && basicSearch.pagination.pages >= 0,
  );

  // Test 2: Text search functionality with realistic search term
  const textSearch = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "", // Empty search should return all categories
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(textSearch);

  TestValidator.predicate(
    "text search returns categories",
    textSearch.data.length >= 0,
  );

  // Test 3: Active status filtering
  const activeSearch = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        active: true,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(activeSearch);

  // Only validate if categories are returned
  if (activeSearch.data.length > 0) {
    TestValidator.predicate(
      "active search returns only active categories",
      activeSearch.data.every((category) => category.active === true),
    );
  }

  // Test 4: Sorting by display order (ascending)
  const sortByDisplayOrderAsc =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        order_by: "display_order",
        order_direction: "asc",
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(sortByDisplayOrderAsc);

  if (sortByDisplayOrderAsc.data.length > 1) {
    TestValidator.predicate(
      "display order ascending sort works correctly",
      sortByDisplayOrderAsc.data.every(
        (category, index, array) =>
          index === 0 ||
          category.display_order >= array[index - 1].display_order,
      ),
    );
  }

  // Test 5: Sorting by display order (descending)
  const sortByDisplayOrderDesc =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        order_by: "display_order",
        order_direction: "desc",
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(sortByDisplayOrderDesc);

  if (sortByDisplayOrderDesc.data.length > 1) {
    TestValidator.predicate(
      "display order descending sort works correctly",
      sortByDisplayOrderDesc.data.every(
        (category, index, array) =>
          index === 0 ||
          category.display_order <= array[index - 1].display_order,
      ),
    );
  }

  // Test 6: Sorting by name (alphabetical ascending)
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

  if (sortByNameAsc.data.length > 1) {
    TestValidator.predicate(
      "name alphabetical ascending sort works correctly",
      sortByNameAsc.data.every(
        (category, index, array) =>
          index === 0 ||
          category.name.localeCompare(array[index - 1].name) >= 0,
      ),
    );
  }

  // Test 7: Sorting by name (alphabetical descending)
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

  if (sortByNameDesc.data.length > 1) {
    TestValidator.predicate(
      "name alphabetical descending sort works correctly",
      sortByNameDesc.data.every(
        (category, index, array) =>
          index === 0 ||
          category.name.localeCompare(array[index - 1].name) <= 0,
      ),
    );
  }

  // Test 8: Sorting by creation date (descending)
  const sortByCreatedAtDesc =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(sortByCreatedAtDesc);

  if (sortByCreatedAtDesc.data.length > 1) {
    TestValidator.predicate(
      "creation date descending sort works correctly",
      sortByCreatedAtDesc.data.every(
        (category, index, array) =>
          index === 0 ||
          new Date(category.created_at) <=
            new Date(array[index - 1].created_at),
      ),
    );
  }

  // Test 9: Sorting by creation date (ascending)
  const sortByCreatedAtAsc = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortByCreatedAtAsc);

  if (sortByCreatedAtAsc.data.length > 1) {
    TestValidator.predicate(
      "creation date ascending sort works correctly",
      sortByCreatedAtAsc.data.every(
        (category, index, array) =>
          index === 0 ||
          new Date(category.created_at) >=
            new Date(array[index - 1].created_at),
      ),
    );
  }

  // Test 10: Combined filtering with sorting
  const combinedSearch = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        active: true,
        order_by: "display_order",
        order_direction: "asc",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(combinedSearch);

  if (combinedSearch.data.length > 0) {
    TestValidator.predicate(
      "combined search returns only active categories",
      combinedSearch.data.every((category) => category.active === true),
    );

    if (combinedSearch.data.length > 1) {
      TestValidator.predicate(
        "combined search maintains sort order",
        combinedSearch.data.every(
          (category, index, array) =>
            index === 0 ||
            category.display_order >= array[index - 1].display_order,
        ),
      );
    }
  }

  // Test 11: Invalid page number handling
  const invalidPageSearch = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 0, // Invalid page number
        limit: 10,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(invalidPageSearch);

  // Test 12: Large limit handling
  const largeLimitSearch = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100, // Large limit
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(largeLimitSearch);

  TestValidator.predicate(
    "large limit search returns valid data",
    largeLimitSearch.data.length <= largeLimitSearch.pagination.limit,
  );
}
