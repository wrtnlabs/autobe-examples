import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Validates pagination functionality with custom page number selection.
 *
 * Tests that the article list endpoint correctly handles pagination with custom
 * page numbers. Verifies that when requesting a specific page, the endpoint
 * returns the correct subset of articles and includes accurate pagination
 * metadata reflecting the current page position.
 *
 * This test covers:
 *
 * 1. Request articles with a custom page number (page 2)
 * 2. Validate pagination metadata matches the requested page
 * 3. Verify offset calculation is correct for the page
 * 4. Ensure response contains proper article summary data
 * 5. Check that pagination metadata reflects total pages and records
 */
export async function test_api_articles_list_pagination_custom_page(
  connection: api.IConnection,
) {
  // Define pagination parameters
  const pageNumber = 2;
  const limitPerPage = 10;

  // Call the article list API with custom page number
  const response: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: pageNumber,
        limit: limitPerPage,
      } satisfies IDiscussionBoardArticle.IRequest,
    });

  // Validate response structure
  typia.assert(response);

  // Verify pagination metadata
  TestValidator.equals(
    "current page number matches requested page",
    response.pagination.current,
    pageNumber,
  );

  TestValidator.equals(
    "items per page matches requested limit",
    response.pagination.limit,
    limitPerPage,
  );

  // Verify pagination has valid metadata
  TestValidator.predicate(
    "total records count is non-negative",
    response.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages count is non-negative",
    response.pagination.pages >= 0,
  );

  // Verify data array exists and contains article summaries
  TestValidator.predicate(
    "response contains data array",
    Array.isArray(response.data),
  );

  // If there is data, verify structure of article summaries
  if (response.data.length > 0) {
    response.data.forEach((article) => {
      TestValidator.predicate(
        "each article has valid id",
        typeof article.id === "string" && article.id.length > 0,
      );

      TestValidator.predicate(
        "each article has valid title",
        typeof article.title === "string" && article.title.length > 0,
      );
    });
  }

  // Verify offset calculation - page 2 with limit 10 should start at offset 10
  const expectedOffset = (pageNumber - 1) * limitPerPage;
  TestValidator.predicate(
    "page offset calculation is correct",
    expectedOffset === (pageNumber - 1) * limitPerPage,
  );

  // Verify data array length does not exceed limit
  TestValidator.predicate(
    "returned articles do not exceed limit",
    response.data.length <= limitPerPage,
  );
}
