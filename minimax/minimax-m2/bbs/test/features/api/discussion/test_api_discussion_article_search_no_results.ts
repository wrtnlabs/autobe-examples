import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionArticle";

/**
 * Test search scenarios that return no results for the economic/political
 * discussion board API.
 *
 * This test validates that when searching with criteria that don't match any
 * articles (such as non-existent categories, author IDs, or search terms), the
 * API properly returns empty results with correct pagination metadata showing
 * zero records. The test covers multiple "no results" scenarios to ensure
 * robust empty result handling.
 *
 * Implementation strategy:
 *
 * 1. Test search with non-existent category that should return no results
 * 2. Test search with non-existent author ID that should return no results
 * 3. Test search with search terms that don't match any article content
 * 4. Validate that all responses contain empty data arrays
 * 5. Validate pagination metadata shows 0 records, 0 pages, and empty results
 * 6. Test combination searches that should yield no matches
 */
export async function test_api_discussion_article_search_no_results(
  connection: api.IConnection,
) {
  // Test 1: Search with non-existent category
  const nonExistentCategoryResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        category: "NonExistentCategoryThatDoesNotExist",
        page: 1,
        limit: 20,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(nonExistentCategoryResult);

  // Validate empty results for non-existent category
  TestValidator.equals(
    "non-existent category should return empty results",
    nonExistentCategoryResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination should show zero records for non-existent category",
    nonExistentCategoryResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination should show zero pages for non-existent category",
    nonExistentCategoryResult.pagination.pages,
    0,
  );

  // Test 2: Search with non-existent author ID
  const nonExistentAuthorResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        author_id: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        limit: 20,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(nonExistentAuthorResult);

  // Validate empty results for non-existent author
  TestValidator.equals(
    "non-existent author should return empty results",
    nonExistentAuthorResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination should show zero records for non-existent author",
    nonExistentAuthorResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination should show zero pages for non-existent author",
    nonExistentAuthorResult.pagination.pages,
    0,
  );

  // Test 3: Search with search terms that don't match any content
  const noContentMatchResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        search: "XYZABC123NonExistentSearchTermsThatWillNotMatchAnyContent",
        page: 1,
        limit: 20,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(noContentMatchResult);

  // Validate empty results for non-matching search terms
  TestValidator.equals(
    "non-matching search terms should return empty results",
    noContentMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination should show zero records for non-matching search",
    noContentMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination should show zero pages for non-matching search",
    noContentMatchResult.pagination.pages,
    0,
  );

  // Test 4: Search with combination of filters that shouldn't match
  const combinedFiltersResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        category: "ImpossibleCategory",
        author_id: typia.random<string & tags.Format<"uuid">>(),
        search: "CompletelyNonExistentContent",
        status: "nonexistent-status",
        page: 1,
        limit: 20,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(combinedFiltersResult);

  // Validate empty results for combined non-matching filters
  TestValidator.equals(
    "combined non-matching filters should return empty results",
    combinedFiltersResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination should show zero records for combined filters",
    combinedFiltersResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination should show zero pages for combined filters",
    combinedFiltersResult.pagination.pages,
    0,
  );

  // Test 5: Search with has_attachments filter on empty result set
  const attachmentFilterResult =
    await api.functional.econPoliticalDiscussion.articles.index(connection, {
      body: {
        category: "AnotherNonExistentCategory",
        has_attachments: true,
        page: 1,
        limit: 20,
      } satisfies IEconPoliticalDiscussionArticle.IRequest,
    });
  typia.assert(attachmentFilterResult);

  // Validate empty results for attachment filter with no matching articles
  TestValidator.equals(
    "attachment filter with non-existent category should return empty results",
    attachmentFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination should show zero records for attachment filter",
    attachmentFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination should show zero pages for attachment filter",
    attachmentFilterResult.pagination.pages,
    0,
  );

  // Test 6: Validate pagination structure integrity for empty results
  TestValidator.equals(
    "current page should be 1 for empty results",
    nonExistentCategoryResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be preserved in empty results",
    nonExistentCategoryResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "all empty results should have consistent pagination structure",
    nonExistentCategoryResult.pagination,
    nonExistentAuthorResult.pagination,
  );
}
