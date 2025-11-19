import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";

/**
 * Test category browsing when no categories exist or search returns no results.
 *
 * This test validates that the pagination API handles empty result sets
 * correctly. It verifies two scenarios:
 *
 * 1. Initial state when no categories exist in the system
 * 2. Search results when query matches no existing categories
 *
 * Both scenarios should return consistent pagination metadata with empty data
 * arrays, ensuring proper API response structure even when no results are
 * found.
 *
 * Steps:
 *
 * 1. Request categories when none exist - verify empty result with valid
 *    pagination
 * 2. Create test categories as setup data
 * 3. Search with non-matching term - verify empty result with valid pagination
 * 4. Validate pagination structure consistency across all empty result scenarios
 */
export async function test_api_category_empty_result_pagination(
  connection: api.IConnection,
) {
  // Step 1: Test initial empty state - no categories exist
  const emptyResult = await api.functional.discussionBoard.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    },
  );
  typia.assert(emptyResult);

  // Verify empty result structure
  TestValidator.equals(
    "empty result data array is empty",
    emptyResult.data,
    [],
  );
  TestValidator.equals(
    "empty result pages is 0",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result records is 0",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    emptyResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    emptyResult.pagination.limit > 0,
  );

  // Step 2: Search with non-existent search term to verify empty search results
  const searchTerm =
    "NonexistentCategoryTopic_" + RandomGenerator.alphaNumeric(10);
  const emptySearchResult =
    await api.functional.discussionBoard.categories.index(connection, {
      body: {
        search: searchTerm,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticleCategory.IRequest,
    });
  typia.assert(emptySearchResult);

  // Verify empty search result structure
  TestValidator.equals(
    "empty search result data array is empty",
    emptySearchResult.data,
    [],
  );
  TestValidator.equals(
    "empty search result pages is 0",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search result records is 0",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.predicate(
    "search pagination current page is valid",
    emptySearchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "search pagination limit is valid",
    emptySearchResult.pagination.limit > 0,
  );

  // Verify consistency between both empty result scenarios
  TestValidator.equals(
    "both empty results have same structure",
    emptyResult.data.length,
    emptySearchResult.data.length,
  );
}
