import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article filtering by publication date range.
 *
 * Validates that the article list API correctly accepts and processes
 * publication date range parameters (publishedDateFrom and publishedDateTo).
 * Tests various date filtering scenarios including:
 *
 * 1. Retrieve articles with both start and end publication dates specified
 * 2. Retrieve articles with only start publication date
 * 3. Retrieve articles with only end publication date
 * 4. Retrieve articles with no date filters
 * 5. Verify pagination works correctly with date range filters
 */
export async function test_api_articles_list_with_published_date_range(
  connection: api.IConnection,
) {
  // Generate test dates for filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Test 1: Retrieve articles within a specific date range
  const resultWithDateRange: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "published",
        publishedDateFrom: twoWeeksAgo.toISOString(),
        publishedDateTo: oneWeekAgo.toISOString(),
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  typia.assert(resultWithDateRange);
  TestValidator.predicate(
    "date range result should have pagination",
    resultWithDateRange.pagination.current >= 1,
  );
  TestValidator.predicate(
    "date range result should have data array",
    Array.isArray(resultWithDateRange.data),
  );

  // Test 2: Retrieve articles with only start publication date
  const resultWithStartDate: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "published",
        publishedDateFrom: twoWeeksAgo.toISOString(),
        publishedDateTo: null,
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  typia.assert(resultWithStartDate);
  TestValidator.predicate(
    "start date only result should have pagination",
    resultWithStartDate.pagination !== undefined,
  );

  // Test 3: Retrieve articles with only end publication date
  const resultWithEndDate: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "published",
        publishedDateFrom: null,
        publishedDateTo: oneWeekAgo.toISOString(),
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  typia.assert(resultWithEndDate);
  TestValidator.predicate(
    "end date only result should have valid pagination",
    resultWithEndDate.pagination.limit > 0,
  );

  // Test 4: Retrieve articles with no date filters
  const resultNoDateFilter: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "published",
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  typia.assert(resultNoDateFilter);
  TestValidator.predicate(
    "no date filter result should return valid response",
    resultNoDateFilter.data !== undefined,
  );

  // Test 5: Verify pagination with date range and custom limit
  const resultWithCustomLimit: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "published",
        publishedDateFrom: twoWeeksAgo.toISOString(),
        publishedDateTo: now.toISOString(),
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  typia.assert(resultWithCustomLimit);
  TestValidator.equals(
    "custom limit should be reflected in pagination",
    resultWithCustomLimit.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "returned articles should not exceed limit",
    resultWithCustomLimit.data.length <= 10,
  );

  // Test 6: Verify articles have required properties
  if (resultWithCustomLimit.data.length > 0) {
    const article = resultWithCustomLimit.data[0];
    TestValidator.predicate(
      "article should have id",
      article.id !== undefined && article.id !== null,
    );
    TestValidator.predicate(
      "article should have title",
      article.title !== undefined && article.title !== null,
    );
  }
}
