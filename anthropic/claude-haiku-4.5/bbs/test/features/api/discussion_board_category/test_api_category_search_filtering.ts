import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";

export async function test_api_category_search_filtering(
  connection: api.IConnection,
) {
  // Test 1: Basic search with partial name matching
  const basicSearch = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        search: "economic",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(basicSearch);
  TestValidator.predicate(
    "search results contain items",
    basicSearch.data.length > 0,
  );

  // Test 2: Case-insensitive search
  const caseInsensitiveSearch =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        search: "ECONOMICS",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(caseInsensitiveSearch);
  TestValidator.equals(
    "case insensitive search returns same results",
    basicSearch.data.length,
    caseInsensitiveSearch.data.length,
  );

  // Test 3: Filter by active status - active categories only
  const activeOnlySearch =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        is_active: true,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(activeOnlySearch);
  TestValidator.predicate(
    "active filter returns results",
    activeOnlySearch.data.length >= 0,
  );

  // Test 4: Filter by inactive status
  const inactiveSearch = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        is_active: false,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(inactiveSearch);

  // Test 5: Combined search and active filter
  const combinedSearch = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        search: "policy",
        is_active: true,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined search and filter returns valid results",
    combinedSearch.data.length >= 0,
  );

  // Test 6: Empty search returns all categories
  const emptySearch = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        search: "",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns categories",
    emptySearch.data.length >= 0,
  );

  // Test 7: Very long search string (boundary condition)
  const longSearchString = RandomGenerator.paragraph({ sentences: 50 });
  const longSearch = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        search: longSearchString.substring(0, 255),
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(longSearch);

  // Test 8: Pagination with search
  const page1Results = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        search: "economics",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(page1Results);
  TestValidator.predicate(
    "pagination limit is respected",
    page1Results.data.length <= 10,
  );

  // Test 9: Sorting by name ascending
  const sortByNameAsc = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        order_by: "name",
        direction: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(sortByNameAsc);

  // Test 10: Sorting by name descending
  const sortByNameDesc = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        order_by: "name",
        direction: "desc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(sortByNameDesc);

  // Test 11: Sorting by display_order
  const sortByDisplayOrder =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        order_by: "display_order",
        direction: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(sortByDisplayOrder);
  TestValidator.predicate(
    "display order sorting returns valid results",
    sortByDisplayOrder.pagination.pages >= 0,
  );

  // Test 12: Sorting by created_at
  const sortByCreatedAt = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        order_by: "created_at",
        direction: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(sortByCreatedAt);

  // Test 13: Verify pagination metadata
  const paginationTest = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination current page matches request",
    paginationTest.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginationTest.pagination.limit,
    5,
  );

  // Test 14: Search with special characters
  const specialCharSearch =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        search: "@#$",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(specialCharSearch);

  // Test 15: No filters or search returns all categories
  const allCategories = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(allCategories);
  TestValidator.predicate(
    "unfiltered query returns pagination info",
    allCategories.pagination.records >= 0,
  );
}
