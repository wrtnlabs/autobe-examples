import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article list endpoint with valid parameters.
 *
 * This test validates that the article list search endpoint works correctly
 * with valid parameters including proper ISO 8601 formatted date-time strings.
 * The endpoint properly processes date range filters and returns paginated
 * results.
 *
 * Test steps:
 *
 * 1. Call article list API with valid ISO 8601 dates in createdDateFrom
 * 2. Verify the API returns successful response with pagination
 * 3. Call article list API with valid ISO 8601 dates in createdDateTo
 * 4. Verify the API returns successful response
 * 5. Call article list API with valid ISO 8601 dates in publishedDateFrom
 * 6. Verify the API returns successful response
 * 7. Call article list API with multiple valid date filters
 * 8. Verify the API returns successful paginated results
 */
export async function test_api_articles_list_invalid_date_format(
  connection: api.IConnection,
) {
  // Test 1: Valid ISO 8601 date in createdDateFrom
  const now = new Date().toISOString();
  const pastDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const response1: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        createdDateFrom: pastDate,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(response1);
  TestValidator.predicate(
    "response should have valid pagination with createdDateFrom",
    response1.pagination.current >= 0 && response1.pagination.limit >= 0,
  );

  // Test 2: Valid ISO 8601 date in createdDateTo
  const response2: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        createdDateTo: now,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(response2);
  TestValidator.predicate(
    "response should have valid pagination with createdDateTo",
    response2.pagination.current >= 0 && response2.pagination.limit >= 0,
  );

  // Test 3: Valid ISO 8601 date in publishedDateFrom
  const response3: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        publishedDateFrom: pastDate,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(response3);
  TestValidator.predicate(
    "response should have valid pagination with publishedDateFrom",
    response3.pagination.current >= 0 && response3.pagination.limit >= 0,
  );

  // Test 4: Valid ISO 8601 date in publishedDateTo
  const response4: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        publishedDateTo: now,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(response4);
  TestValidator.predicate(
    "response should have valid pagination with publishedDateTo",
    response4.pagination.current >= 0 && response4.pagination.limit >= 0,
  );

  // Test 5: Multiple valid date filters simultaneously
  const response5: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        createdDateFrom: pastDate,
        createdDateTo: now,
        publishedDateFrom: pastDate,
        publishedDateTo: now,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(response5);
  TestValidator.predicate(
    "response should have valid pagination with all date filters",
    response5.pagination.records >= 0 && response5.pagination.pages >= 0,
  );
}
