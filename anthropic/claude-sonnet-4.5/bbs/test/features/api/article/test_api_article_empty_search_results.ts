import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test edge cases where search criteria return no matching articles.
 *
 * This test validates that the article search API properly handles empty result
 * sets when search criteria match no articles. It ensures that the API returns
 * proper pagination metadata with zero records and pages, empty data arrays,
 * and appropriate response structure without errors across multiple no-results
 * scenarios.
 *
 * Test scenarios:
 *
 * 1. Search with non-existent keywords
 * 2. Filter by non-existent author IDs
 * 3. Use date ranges with no articles
 * 4. Request pages beyond available data
 */
export async function test_api_article_empty_search_results(
  connection: api.IConnection,
) {
  // Scenario 1: Search with keyword that doesn't exist in any article
  const nonExistentKeyword = typia.random<string & tags.Format<"uuid">>();
  const emptySearchResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: nonExistentKeyword,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(emptySearchResult);

  TestValidator.equals(
    "empty search returns zero records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns zero pages",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.predicate(
    "data array is empty",
    emptySearchResult.data.length === 0,
  );

  // Scenario 2: Filter by non-existent author ID
  const nonExistentAuthorId = typia.random<string & tags.Format<"uuid">>();
  const emptyAuthorResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        discussion_board_member_id: nonExistentAuthorId,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(emptyAuthorResult);

  TestValidator.equals(
    "non-existent author returns zero records",
    emptyAuthorResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent author returns zero pages",
    emptyAuthorResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent author returns empty data array",
    emptyAuthorResult.data.length,
    0,
  );

  // Scenario 3: Date range with no articles
  const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const farFutureDate = new Date(Date.now() + 730 * 24 * 60 * 60 * 1000);

  const emptyDateRangeResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        created_at_from: futureDate.toISOString(),
        created_at_to: farFutureDate.toISOString(),
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(emptyDateRangeResult);

  TestValidator.equals(
    "future date range returns zero records",
    emptyDateRangeResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date range returns zero pages",
    emptyDateRangeResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "future date range returns empty data array",
    emptyDateRangeResult.data.length,
    0,
  );

  // Scenario 4: Request page beyond available data
  const beyondPageResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: nonExistentKeyword,
        page: 999,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(beyondPageResult);

  TestValidator.equals(
    "page beyond data returns zero records",
    beyondPageResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "page beyond data returns zero pages",
    beyondPageResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "page beyond data returns empty data array",
    beyondPageResult.data.length,
    0,
  );

  // Scenario 5: Combined filters with no matches
  const combinedEmptyResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: nonExistentKeyword,
        discussion_board_member_id: nonExistentAuthorId,
        created_at_from: futureDate.toISOString(),
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(combinedEmptyResult);

  TestValidator.equals(
    "combined filters return zero records",
    combinedEmptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filters return zero pages",
    combinedEmptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "combined filters return empty data array",
    combinedEmptyResult.data.length,
    0,
  );

  // Verify pagination metadata consistency across all empty results
  const allEmptyResults = [
    emptySearchResult,
    emptyAuthorResult,
    emptyDateRangeResult,
    beyondPageResult,
    combinedEmptyResult,
  ];

  for (const result of allEmptyResults) {
    TestValidator.predicate(
      "pagination current is non-negative",
      result.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit is non-negative",
      result.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "empty results have consistent structure",
      result.pagination.records === 0 &&
        result.pagination.pages === 0 &&
        result.data.length === 0,
    );
  }
}
