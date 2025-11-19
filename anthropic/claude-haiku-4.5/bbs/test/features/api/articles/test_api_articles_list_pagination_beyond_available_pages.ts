import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article list retrieval with pagination beyond available pages.
 *
 * Validates that the article list endpoint gracefully handles requests for page
 * numbers that exceed the total available pages. The API should return an empty
 * result set with correct pagination information indicating the requested page
 * is beyond the available data range.
 *
 * This test ensures the endpoint:
 *
 * - Accepts pagination requests for non-existent pages
 * - Returns empty data array when page is beyond available articles
 * - Provides accurate pagination metadata (current page, total pages, records)
 * - Maintains proper response structure even with out-of-range pagination
 *
 * Steps:
 *
 * 1. Request article list with an extremely high page number (e.g., page 999999)
 * 2. Verify the API returns a successful response
 * 3. Validate pagination shows correct current page, limit, total records, and
 *    total pages
 * 4. Confirm the data array is empty since no articles exist on that page
 * 5. Verify response structure matches expected
 *    IPageIDiscussionBoardArticle.ISummary type
 */
export async function test_api_articles_list_pagination_beyond_available_pages(
  connection: api.IConnection,
) {
  // Request articles with an extremely high page number that exceeds available pages
  const beyondPageResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 999999, // Request page far beyond any realistic article count
        limit: 20, // Standard page size
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  // Validate response structure and type
  typia.assert(beyondPageResult);

  // Verify pagination information is correct
  TestValidator.predicate(
    "pagination exists in response",
    beyondPageResult.pagination !== null &&
      beyondPageResult.pagination !== undefined,
  );

  // Verify that the data array is empty when requesting beyond available pages
  TestValidator.equals(
    "data array should be empty for page beyond available pages",
    beyondPageResult.data.length,
    0,
  );

  // Verify the current page matches what was requested
  TestValidator.equals(
    "current page should match requested page",
    beyondPageResult.pagination.current,
    999999,
  );

  // Verify the limit matches what was requested
  TestValidator.equals(
    "limit should match requested limit",
    beyondPageResult.pagination.limit,
    20,
  );

  // Verify that total pages is a valid number
  TestValidator.predicate(
    "total pages should be a non-negative integer",
    beyondPageResult.pagination.pages >= 0,
  );

  // Verify that records total is non-negative
  TestValidator.predicate(
    "total records should be non-negative",
    beyondPageResult.pagination.records >= 0,
  );

  // Verify that the current page is greater than total pages when beyond available
  TestValidator.predicate(
    "current page should be greater than or equal to total pages",
    beyondPageResult.pagination.current >= beyondPageResult.pagination.pages,
  );

  // Test with another high page number to ensure consistency
  const anotherBeyondPageResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 100000,
        limit: 50,
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  typia.assert(anotherBeyondPageResult);

  TestValidator.equals(
    "another beyond-page request should return empty data",
    anotherBeyondPageResult.data.length,
    0,
  );

  TestValidator.equals(
    "another beyond-page should have correct current page",
    anotherBeyondPageResult.pagination.current,
    100000,
  );

  TestValidator.equals(
    "another beyond-page should have correct limit",
    anotherBeyondPageResult.pagination.limit,
    50,
  );
}
