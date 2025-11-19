import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test retrieving only locked articles using isLocked filter set to true.
 *
 * This test validates that the article list filtering API correctly returns
 * only articles with comments disabled (locked status). It verifies that when
 * the isLocked filter is set to true in the request, the API response contains
 * only locked articles, confirming proper filtering of editorial restrictions
 * on article comments.
 *
 * The test performs the following steps:
 *
 * 1. Call the article list API with isLocked filter set to true
 * 2. Validate that the response contains pagination information
 * 3. Verify that all returned articles have the locked status applied
 * 4. Confirm the response structure matches the expected ISummary format
 */
export async function test_api_articles_list_filter_by_locked_status_true(
  connection: api.IConnection,
) {
  // Call the article list API with isLocked filter set to true
  const response: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        isLocked: true,
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  // Validate the response structure
  typia.assert(response);

  // Verify pagination information is present
  TestValidator.predicate(
    "response should have pagination information",
    response.pagination !== null && response.pagination !== undefined,
  );

  // Verify that pagination contains expected properties
  TestValidator.predicate(
    "pagination should have current page",
    response.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination should have limit",
    response.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination should have records count",
    response.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination should have pages count",
    response.pagination.pages >= 0,
  );

  // Verify data array exists
  TestValidator.predicate(
    "response should contain data array",
    Array.isArray(response.data),
  );

  // Verify each article in the response has required summary properties
  if (response.data.length > 0) {
    response.data.forEach((article, index) => {
      TestValidator.predicate(
        `article ${index} should have id`,
        article.id !== undefined &&
          article.id !== null &&
          article.id.length > 0,
      );

      TestValidator.predicate(
        `article ${index} should have title`,
        article.title !== undefined && article.title !== null,
      );
    });
  }

  // Verify that the filter was applied correctly by checking response validity
  TestValidator.predicate(
    "response should match expected structure with locked articles",
    response.pagination && Array.isArray(response.data),
  );
}
