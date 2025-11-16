import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Test error handling when attempting to delete a non-existent article.
 *
 * Verifies that requesting deletion of a non-existent article ID returns a 404
 * Not Found error with appropriate error messaging. The test confirms that the
 * system validates article existence before attempting deletion and properly
 * handles the error condition.
 *
 * Test steps:
 *
 * 1. Generate a valid UUID that does not exist in the system
 * 2. Attempt to delete the non-existent article via the API
 * 3. Verify that an HttpError with 404 status is thrown
 * 4. Confirm the error is properly caught and indicates the article was not found
 */
export async function test_api_article_deletion_nonexistent_article(
  connection: api.IConnection,
) {
  // Generate a non-existent article ID with valid UUID format
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to delete the non-existent article and verify 404 error is thrown
  await TestValidator.httpError(
    "attempting to delete non-existent article should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.articles.erase(connection, {
        articleId: nonExistentArticleId,
      });
    },
  );

  // Additional test: Verify error with different non-existent article ID
  const anotherNonExistentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.httpError(
    "second deletion attempt with different non-existent ID should also return 404",
    404,
    async () => {
      await api.functional.discussionBoard.articles.erase(connection, {
        articleId: anotherNonExistentId,
      });
    },
  );
}
