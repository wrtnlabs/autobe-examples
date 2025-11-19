import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article list with invalid orderBy value not in allowed enum.
 *
 * Validates that the article list endpoint returns a validation error when
 * provided with an orderBy value that is not one of the allowed enum values
 * (createdAt, publishedAt, viewCount, commentCount, isPinned).
 *
 * This test ensures the API properly validates request parameters and rejects
 * invalid sort field specifications before processing the query.
 *
 * Steps:
 *
 * 1. Prepare a request with an invalid orderBy value not in the allowed enum
 * 2. Call the article list API with this invalid request
 * 3. Verify the endpoint returns a validation error
 */
export async function test_api_articles_list_invalid_order_by_value(
  connection: api.IConnection,
) {
  // Prepare request with invalid orderBy value
  const invalidRequest = {
    page: 1,
    limit: 20,
    orderBy: "invalidSortField" as any, // Not in allowed enum
    order: "asc",
  } satisfies IDiscussionBoardArticle.IRequest;

  // Attempt to call the API with invalid orderBy value
  // Expect the endpoint to return a validation error
  await TestValidator.error(
    "should reject invalid orderBy value not in allowed enum",
    async () => {
      await api.functional.discussionBoard.articles.index(connection, {
        body: invalidRequest,
      });
    },
  );
}
