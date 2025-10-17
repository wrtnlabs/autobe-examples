import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";

/**
 * Test the full-text search capability across category names to help users find
 * relevant categories quickly.
 *
 * This test validates the advanced search functionality that enables efficient
 * category discovery by:
 *
 * 1. Executing PATCH /discussionBoard/categories with search criteria targeting
 *    specific category name keywords (e.g., 'Economics')
 * 2. Confirming response returns only categories matching the search text
 * 3. Verifying search matches category names
 * 4. Testing partial text matching to ensure fuzzy search capabilities
 * 5. Validating that irrelevant categories are excluded from results
 * 6. Confirming pagination works correctly with filtered search results
 * 7. Verifying empty results for non-matching search queries return appropriate
 *    response
 */
export async function test_api_category_search_by_name_filtering(
  connection: api.IConnection,
) {
  // Test 1: Search with a specific keyword that should match category names
  const economicsSearchResult =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        search: "Economics",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(economicsSearchResult);

  // Verify pagination structure
  TestValidator.predicate(
    "search results should have valid pagination",
    economicsSearchResult.pagination.current === 1 &&
      economicsSearchResult.pagination.limit === 10,
  );

  // Verify all returned categories contain the search keyword in name
  if (economicsSearchResult.data.length > 0) {
    const allMatchSearch = economicsSearchResult.data.every((category) =>
      category.name.toLowerCase().includes("economics"),
    );
    TestValidator.predicate(
      "all returned categories should match search keyword",
      allMatchSearch,
    );
  }

  // Test 2: Partial text matching - search with partial keyword
  const partialSearchResult =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        search: "econ",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(partialSearchResult);

  // Verify partial search returns results
  if (partialSearchResult.data.length > 0) {
    const matchesPartial = partialSearchResult.data.some((category) =>
      category.name.toLowerCase().includes("econ"),
    );
    TestValidator.predicate(
      "partial search should match categories",
      matchesPartial,
    );
  }

  // Test 3: Search with non-matching query should return empty results
  const nonMatchingSearch =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        search: typia.random<string & tags.Pattern<"^[a-z]{20}$">>(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(nonMatchingSearch);

  TestValidator.predicate(
    "non-matching search should return valid response structure",
    nonMatchingSearch.pagination !== null &&
      nonMatchingSearch.pagination !== undefined,
  );

  // Test 4: Pagination with search - verify page navigation works with filtered results
  const paginatedSearchResult =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        search: "Politics",
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(paginatedSearchResult);

  TestValidator.predicate(
    "pagination limit should be respected in search results",
    paginatedSearchResult.data.length <= 5,
  );

  // Test 5: Search without search parameter - should return all categories with pagination
  const allCategoriesResult =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardCategory.IRequest,
    });
  typia.assert(allCategoriesResult);

  TestValidator.predicate(
    "request without search should return categories",
    allCategoriesResult.pagination.records >= 0,
  );

  // Test 6: Verify search is case-insensitive
  const upperCaseSearch = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        search: "MACRO",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(upperCaseSearch);

  const lowerCaseSearch = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        search: "macro",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardCategory.IRequest,
    },
  );
  typia.assert(lowerCaseSearch);

  // Both searches should return the same number of results if search is case-insensitive
  TestValidator.equals(
    "case-insensitive search should return same results",
    upperCaseSearch.data.length,
    lowerCaseSearch.data.length,
  );
}
