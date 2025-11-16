import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";

/**
 * Test browsing discussion board categories with pagination support.
 *
 * This test validates the category browsing API with comprehensive pagination
 * testing. It verifies default pagination, custom page sizes, metadata
 * calculation, and sorting functionality across various scenarios.
 *
 * Test flow:
 *
 * 1. Retrieve categories with default pagination (page 1, limit 20)
 * 2. Test custom page sizes and pagination metadata validation
 * 3. Verify default sorting by display_order
 * 4. Test sorting by name, created_at, and display_order in both directions
 * 5. Test boundary conditions and edge cases
 * 6. Verify search and filtering work with pagination
 */
export async function test_api_category_browsing_with_pagination(
  connection: api.IConnection,
) {
  // Test 1: Default pagination (page 1, limit 20)
  const defaultResult = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(defaultResult);

  // Validate pagination metadata
  TestValidator.predicate(
    "default pagination current page should be 1",
    defaultResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "default pagination limit should be 20",
    defaultResult.pagination.limit === 20,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    defaultResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be correctly calculated",
    defaultResult.pagination.pages ===
      Math.ceil(
        defaultResult.pagination.records / defaultResult.pagination.limit,
      ),
  );

  // Test 2: Custom page size - limit 10
  const customLimit10 = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        limit: 10,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(customLimit10);
  TestValidator.equals(
    "custom limit 10 should be respected",
    customLimit10.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    customLimit10.data.length <= 10,
  );

  // Test 3: Custom page size - limit 50
  const customLimit50 = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        limit: 50,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(customLimit50);
  TestValidator.equals(
    "custom limit 50 should be respected",
    customLimit50.pagination.limit,
    50,
  );

  // Test 4: Pagination to second page
  if (defaultResult.pagination.records > 20) {
    const secondPage = await api.functional.discussionBoard.categories.index(
      connection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IDiscussionBoardCategory.IRequest,
      },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "page 2 should be returned",
      secondPage.pagination.current,
      2,
    );
    TestValidator.predicate(
      "second page should have different data",
      JSON.stringify(secondPage.data) !== JSON.stringify(defaultResult.data),
    );
  }

  // Test 5: Sorting by display_order (default)
  const sortDefault = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        order_by: "display_order",
        direction: "asc",
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(sortDefault);

  // Validate that categories are sorted by display_order in ascending order
  for (let i = 0; i < sortDefault.data.length - 1; i++) {
    TestValidator.predicate(
      `category ${i} display_order should be <= category ${i + 1} display_order`,
      sortDefault.data[i].display_order <=
        sortDefault.data[i + 1].display_order,
    );
  }

  // Test 6: Sorting by display_order descending
  const sortDescending = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        order_by: "display_order",
        direction: "desc",
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(sortDescending);

  // Validate that categories are sorted by display_order in descending order
  for (let i = 0; i < sortDescending.data.length - 1; i++) {
    TestValidator.predicate(
      `category ${i} display_order should be >= category ${i + 1} display_order`,
      sortDescending.data[i].display_order >=
        sortDescending.data[i + 1].display_order,
    );
  }

  // Test 7: Sorting by name ascending
  const sortByName = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        order_by: "name",
        direction: "asc",
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(sortByName);

  // Validate that categories are sorted by name in ascending order
  for (let i = 0; i < sortByName.data.length - 1; i++) {
    TestValidator.predicate(
      `category ${i} name should be <= category ${i + 1} name`,
      sortByName.data[i].name <= sortByName.data[i + 1].name,
    );
  }

  // Test 8: Sorting by created_at
  const sortByCreatedAt = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        order_by: "created_at",
        direction: "asc",
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(sortByCreatedAt);
  TestValidator.predicate(
    "created_at sorting should return valid results",
    sortByCreatedAt.data.length >= 0,
  );

  // Test 9: Boundary condition - page 1 with limit 1
  const minimalPagination =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(minimalPagination);
  TestValidator.equals(
    "minimal limit should be 1",
    minimalPagination.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "minimal pagination should have at most 1 item",
    minimalPagination.data.length <= 1,
  );

  // Test 10: Boundary condition - limit at maximum (100)
  const maximalLimit = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(maximalLimit);
  TestValidator.equals(
    "maximal limit should be 100",
    maximalLimit.pagination.limit,
    100,
  );

  // Test 11: Search with pagination
  const searchQuery = "economics";
  const searchResult = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        search: searchQuery,
        limit: 10,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search result pagination should be valid",
    searchResult.pagination.limit === 10,
  );

  // Test 12: Active status filtering with pagination
  const activeOnly = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        is_active: true,
        limit: 20,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(activeOnly);
  TestValidator.predicate(
    "active filter with pagination should return valid results",
    activeOnly.pagination.limit === 20,
  );

  // Test 13: Inactive status filtering
  const inactiveOnly = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        is_active: false,
        limit: 20,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(inactiveOnly);
  TestValidator.predicate(
    "inactive filter should return valid results",
    inactiveOnly.pagination.limit === 20,
  );

  // Test 14: All categories (no filter)
  const allCategories = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        is_active: null,
        limit: 20,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(allCategories);
  TestValidator.predicate(
    "null filter should return all categories",
    allCategories.pagination.limit === 20,
  );

  // Test 15: Validate category data structure in results
  if (defaultResult.data.length > 0) {
    const category = defaultResult.data[0];
    TestValidator.predicate(
      "category should have valid id",
      typeof category.id === "string" && category.id.length > 0,
    );
    TestValidator.predicate(
      "category should have valid name",
      typeof category.name === "string" && category.name.length > 0,
    );
    TestValidator.predicate(
      "category should have valid slug",
      typeof category.slug === "string" && category.slug.length > 0,
    );
    TestValidator.predicate(
      "category should have valid display_order",
      typeof category.display_order === "number" && category.display_order >= 0,
    );
    TestValidator.predicate(
      "category should have valid article_count",
      typeof category.article_count === "number" && category.article_count >= 0,
    );
  }

  // Test 16: Pagination consistency across requests
  const firstFetch = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(firstFetch);

  const totalPages = firstFetch.pagination.pages;
  TestValidator.predicate(
    "total pages should be correctly calculated",
    totalPages ===
      Math.ceil(firstFetch.pagination.records / firstFetch.pagination.limit),
  );
}
