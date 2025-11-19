import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article list retrieval with maximum page size limit.
 *
 * Validates that the discussion board article list endpoint correctly handles
 * pagination with the maximum allowed page size limit of 100 articles per page.
 * This test ensures the endpoint properly processes requests with limit=100 and
 * returns appropriate pagination metadata and article summaries without
 * errors.
 *
 * Steps:
 *
 * 1. Call the article list endpoint with maximum limit (100)
 * 2. Validate the response structure contains pagination info and data
 * 3. Verify pagination metadata is correctly populated
 * 4. Ensure returned data is an array of article summaries
 */
export async function test_api_articles_list_pagination_max_limit(
  connection: api.IConnection,
) {
  // Call the article list endpoint with maximum allowed limit
  const result: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        limit: 100,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  // Validate the response structure
  typia.assert(result);

  // Verify pagination metadata exists and is properly structured
  TestValidator.predicate(
    "pagination metadata should exist",
    result.pagination !== null && result.pagination !== undefined,
  );

  // Verify pagination contains expected fields
  TestValidator.predicate(
    "pagination should have current page",
    result.pagination.current >= 1,
  );

  TestValidator.predicate(
    "pagination should have limit set to 100",
    result.pagination.limit === 100,
  );

  TestValidator.predicate(
    "pagination should have total records count",
    result.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination should have total pages count",
    result.pagination.pages >= 0,
  );

  // Verify data array exists and contains article summaries
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(result.data),
  );

  // If articles exist, verify each has required summary fields
  if (result.data.length > 0) {
    TestValidator.predicate(
      "each article should have id",
      result.data.every(
        (article) => article.id !== undefined && article.id !== null,
      ),
    );

    TestValidator.predicate(
      "each article should have title",
      result.data.every(
        (article) => article.title !== undefined && article.title !== null,
      ),
    );
  }

  // Verify returned data count does not exceed limit
  TestValidator.predicate(
    "returned articles should not exceed limit of 100",
    result.data.length <= 100,
  );
}
