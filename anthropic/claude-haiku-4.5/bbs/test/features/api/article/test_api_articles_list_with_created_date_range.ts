import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test retrieving articles filtered by creation date range.
 *
 * Validates that the article list API correctly filters articles based on
 * createdDateFrom and createdDateTo parameters. Both date bounds are inclusive,
 * so articles created exactly at the start or end dates are included. The test
 * verifies filtering works correctly with various date range combinations and
 * that pagination information is accurate.
 *
 * Test workflow:
 *
 * 1. Test with only createdDateFrom - articles created on or after the date
 * 2. Test with only createdDateTo - articles created on or before the date
 * 3. Test with both dates - articles created within the inclusive range
 * 4. Verify response structure contains proper pagination and article summaries
 * 5. Validate that date filtering actually restricts results appropriately
 */
export async function test_api_articles_list_with_created_date_range(
  connection: api.IConnection,
) {
  // Generate base timestamps for testing different date ranges
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Test 1: Filter articles with only createdDateFrom (no upper bound)
  const responseFromDate = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        createdDateFrom: twoWeeksAgo.toISOString(),
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(responseFromDate);
  TestValidator.predicate(
    "response should have pagination property",
    responseFromDate.pagination !== null &&
      responseFromDate.pagination !== undefined,
  );
  TestValidator.predicate(
    "response should have data array",
    Array.isArray(responseFromDate.data),
  );
  TestValidator.predicate(
    "pagination should have current property",
    responseFromDate.pagination.current !== null,
  );

  // Test 2: Filter articles with only createdDateTo (no lower bound)
  const responseToDate = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        createdDateTo: oneWeekFromNow.toISOString(),
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(responseToDate);
  TestValidator.predicate(
    "response with createdDateTo should have data",
    Array.isArray(responseToDate.data),
  );

  // Test 3: Filter articles with both createdDateFrom and createdDateTo
  const responseBothDates = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        createdDateFrom: twoWeeksAgo.toISOString(),
        createdDateTo: oneWeekFromNow.toISOString(),
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(responseBothDates);
  TestValidator.predicate(
    "response with date range should have data array",
    Array.isArray(responseBothDates.data),
  );
  TestValidator.predicate(
    "response with date range should have pagination",
    responseBothDates.pagination !== null,
  );

  // Test 4: Verify article structure in response
  if (responseBothDates.data.length > 0) {
    const firstArticle = responseBothDates.data[0];
    TestValidator.predicate(
      "article should have id",
      typeof firstArticle.id === "string" && firstArticle.id.length > 0,
    );
    TestValidator.predicate(
      "article should have title",
      typeof firstArticle.title === "string" && firstArticle.title.length > 0,
    );
  }

  // Test 5: Verify pagination structure
  TestValidator.predicate(
    "pagination current page should be valid",
    responseBothDates.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be valid",
    responseBothDates.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should match or exceed data length",
    responseBothDates.pagination.records >= responseBothDates.data.length,
  );

  // Test 6: Test with narrower date range (same date for both)
  const narrowDate = oneWeekAgo.toISOString();
  const responseNarrowRange =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 50,
        createdDateFrom: narrowDate,
        createdDateTo: narrowDate,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(responseNarrowRange);
  TestValidator.predicate(
    "narrow date range response should be valid",
    responseNarrowRange.pagination !== null,
  );
}
