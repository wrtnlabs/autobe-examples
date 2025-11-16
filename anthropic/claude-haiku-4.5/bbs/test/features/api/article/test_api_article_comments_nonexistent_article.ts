import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Validates error handling when attempting to retrieve comments for a
 * non-existent article.
 *
 * This test verifies that the API properly handles requests for comments on
 * articles that do not exist. It ensures the system validates article existence
 * before processing comment retrieval requests and returns appropriate error
 * responses.
 *
 * Test scenarios covered:
 *
 * 1. Requesting comments for a UUID-formatted but non-existent article ID
 * 2. Verifying error response when article does not exist
 * 3. Confirming that the API validates article existence at the request layer
 *
 * Expected behavior: The API should return an error indicating the article was
 * not found before attempting to retrieve comments.
 */
export async function test_api_article_comments_nonexistent_article(
  connection: api.IConnection,
) {
  // Generate a valid UUID format that does not correspond to any existing article
  const nonexistentArticleId = typia.random<string & tags.Format<"uuid">>();

  // Create a valid request body with default pagination parameters
  const requestBody = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardComment.IRequest;

  // Attempt to retrieve comments for the non-existent article
  // This should fail with an error since the article doesn't exist
  await TestValidator.error(
    "should fail when requesting comments for non-existent article",
    async () => {
      await api.functional.discussionBoard.articles.comments.index(connection, {
        articleId: nonexistentArticleId,
        body: requestBody,
      });
    },
  );

  // Test with another non-existent UUID to ensure consistent error handling
  const anotherNonexistentArticleId = typia.random<
    string & tags.Format<"uuid">
  >();

  // Attempt with different pagination parameters to verify error handling
  // is consistent regardless of request body content
  const alternateRequestBody = {
    page: 1,
    limit: 50,
    sortBy: "created_at" as const,
    order: "desc" as const,
  } satisfies IDiscussionBoardComment.IRequest;

  await TestValidator.error(
    "should consistently fail for multiple non-existent article IDs",
    async () => {
      await api.functional.discussionBoard.articles.comments.index(connection, {
        articleId: anotherNonexistentArticleId,
        body: alternateRequestBody,
      });
    },
  );

  // Verify that valid UUID format with search parameters also fails appropriately
  const thirdNonexistentArticleId = typia.random<
    string & tags.Format<"uuid">
  >();

  const searchRequestBody = {
    page: 1,
    limit: 20,
    search: "test search query",
  } satisfies IDiscussionBoardComment.IRequest;

  await TestValidator.error(
    "should fail when searching comments on non-existent article",
    async () => {
      await api.functional.discussionBoard.articles.comments.index(connection, {
        articleId: thirdNonexistentArticleId,
        body: searchRequestBody,
      });
    },
  );
}
