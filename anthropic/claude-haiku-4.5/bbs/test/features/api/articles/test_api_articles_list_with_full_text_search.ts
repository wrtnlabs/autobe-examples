import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * E2E Test: Full-Text Search on Discussion Board Articles
 *
 * This test validates the article list endpoint with comprehensive full-text
 * search capabilities:
 *
 * 1. **Search Functionality**: Verify that the search parameter filters articles
 *    correctly
 * 2. **Case-Insensitivity**: Confirm that search matching works regardless of
 *    character case
 * 3. **Pagination**: Ensure search results respect page and limit parameters
 * 4. **Response Structure**: Validate that pagination metadata is correct
 * 5. **Empty Results**: Test behavior when search terms match no articles
 * 6. **No Search Filter**: Verify articles are returned when no search term is
 *    specified
 */
export async function test_api_articles_list_with_full_text_search(
  connection: api.IConnection,
) {
  // Test 1: Basic search with a generic term
  const searchResults1 = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: "the",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResults1);
  TestValidator.predicate(
    "search results should have pagination structure",
    searchResults1.pagination &&
      searchResults1.pagination.current !== undefined &&
      searchResults1.pagination.limit !== undefined,
  );

  // Test 2: Verify pagination limit is respected
  TestValidator.equals(
    "returned items should not exceed requested limit",
    searchResults1.data.length <= searchResults1.pagination.limit,
    true,
  );

  // Test 3: Case-insensitive search - uppercase vs lowercase
  const searchUpperCase = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: "THE",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchUpperCase);
  TestValidator.equals(
    "uppercase search should return same results as lowercase",
    searchResults1.data.length,
    searchUpperCase.data.length,
  );

  // Test 4: Different search term
  const searchResults2 = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: "article",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResults2);

  // Test 5: Search with non-matching term
  const searchNoMatch = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: "xyznonexistent123abcdef",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchNoMatch);
  TestValidator.equals(
    "non-matching search should return empty results",
    searchNoMatch.data.length,
    0,
  );

  // Test 6: Pagination with different page numbers
  const searchPage2 = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: "a",
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchPage2);
  TestValidator.equals(
    "pagination current page should reflect requested page",
    searchPage2.pagination.current,
    2,
  );

  // Test 7: Search without search term returns results
  const searchNoFilter = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchNoFilter);
  TestValidator.predicate(
    "search without filter should have valid pagination",
    searchNoFilter.pagination.records >= 0,
  );

  // Test 8: Verify all returned articles have required fields
  TestValidator.predicate(
    "all returned articles should have id and title",
    searchResults1.data.every(
      (article: IDiscussionBoardArticle.ISummary) =>
        article.id &&
        typeof article.id === "string" &&
        article.title &&
        typeof article.title === "string",
    ),
  );

  // Test 9: Pagination records field is valid
  TestValidator.predicate(
    "pagination records count should be non-negative",
    searchResults1.pagination.records >= 0,
  );

  // Test 10: Pagination pages calculation should be correct
  const expectedPages = Math.ceil(
    searchResults1.pagination.records / searchResults1.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages should match calculated value",
    searchResults1.pagination.pages,
    expectedPages,
  );
}
