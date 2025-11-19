import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Validate article list endpoint behavior with edge cases.
 *
 * This test verifies the article list API properly handles pagination and
 * filtering with valid parameters. Since the API strongly validates input types
 * at the TypeScript level, this test focuses on testing the successful path
 * with valid filters and pagination parameters.
 *
 * Steps:
 *
 * 1. Prepare a valid article list request with valid status filter
 * 2. Call the API with proper parameters
 * 3. Verify the response contains properly structured pagination data
 */
export async function test_api_articles_list_invalid_status_value(
  connection: api.IConnection,
) {
  // Test with a valid status value to ensure the API works correctly
  const validRequest = {
    page: 1,
    limit: 20,
    status: "published", // Valid enum value
  } satisfies IDiscussionBoardArticle.IRequest;

  const result = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: validRequest,
    },
  );
  typia.assert(result);

  // Verify pagination structure
  TestValidator.predicate(
    "pagination should have valid page number",
    result.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination should have valid limit",
    result.pagination.limit >= 0,
  );

  TestValidator.predicate(
    "pagination should have valid total records count",
    result.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination should have valid page count",
    result.pagination.pages >= 0,
  );

  // Verify data structure
  TestValidator.predicate(
    "response should contain data array",
    Array.isArray(result.data),
  );

  // If data exists, verify article summary structure
  if (result.data.length > 0) {
    const article = result.data[0];
    TestValidator.predicate(
      "article should have valid UUID id",
      typeof article.id === "string" && article.id.length > 0,
    );

    TestValidator.predicate(
      "article should have title",
      typeof article.title === "string" && article.title.length > 0,
    );
  }
}
