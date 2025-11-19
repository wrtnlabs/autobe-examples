import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test that pagination metadata is accurate and consistent.
 *
 * This test validates pagination metadata accuracy by calling the article list
 * endpoint with different pagination parameters and verifying that:
 *
 * - Pagination.current reflects the requested page number
 * - Pagination.limit shows the requested items per page
 * - Pagination.records contains the total article count
 * - Pagination.pages calculates correct total pages (ceil(records/limit))
 *
 * The test performs multiple requests with different pagination configurations
 * to ensure consistency and correctness across various scenarios.
 */
export async function test_api_articles_list_pagination_metadata_accuracy(
  connection: api.IConnection,
) {
  // Test pagination with different page and limit combinations
  const testCases = [
    { page: 1, limit: 10 },
    { page: 1, limit: 20 },
    { page: 2, limit: 15 },
    { page: 1, limit: 5 },
  ];

  for (const testCase of testCases) {
    const response = await api.functional.discussionBoard.articles.index(
      connection,
      {
        body: {
          page: testCase.page,
          limit: testCase.limit,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(response);

    // Validate pagination.current matches requested page
    TestValidator.equals(
      `pagination.current should equal requested page ${testCase.page}`,
      response.pagination.current,
      testCase.page,
    );

    // Validate pagination.limit matches requested limit
    TestValidator.equals(
      `pagination.limit should equal requested limit ${testCase.limit}`,
      response.pagination.limit,
      testCase.limit,
    );

    // Validate pagination.records is a non-negative integer
    TestValidator.predicate(
      "pagination.records should be non-negative",
      response.pagination.records >= 0,
    );

    // Validate pagination.pages calculation
    // pages should be ceil(records / limit)
    const expectedPages = Math.ceil(
      response.pagination.records / testCase.limit,
    );
    TestValidator.equals(
      `pagination.pages should equal ceil(${response.pagination.records}/${testCase.limit})`,
      response.pagination.pages,
      expectedPages,
    );

    // Validate data array length is correct
    // Last page may have fewer items, other pages should have exactly limit items
    const isLastPage = response.pagination.current >= expectedPages;
    if (isLastPage && response.pagination.records > 0) {
      const expectedLastPageItems =
        response.pagination.records % testCase.limit === 0
          ? testCase.limit
          : response.pagination.records % testCase.limit;
      TestValidator.predicate(
        "last page should have correct number of items",
        response.data.length === expectedLastPageItems,
      );
    } else if (!isLastPage && response.pagination.records > 0) {
      TestValidator.equals(
        `non-last page should have exactly ${testCase.limit} items`,
        response.data.length,
        testCase.limit,
      );
    }
  }

  // Test with default pagination (no page/limit specified)
  const defaultResponse = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(defaultResponse);

  // Verify default pagination values are valid
  TestValidator.predicate(
    "default pagination.current should be at least 1",
    defaultResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default pagination.limit should be at least 1",
    defaultResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "default pagination.records should be non-negative",
    defaultResponse.pagination.records >= 0,
  );

  // Verify pages calculation for default response
  const defaultExpectedPages = Math.ceil(
    defaultResponse.pagination.records / defaultResponse.pagination.limit,
  );
  TestValidator.equals(
    "default response pagination.pages should match calculation",
    defaultResponse.pagination.pages,
    defaultExpectedPages,
  );
}
