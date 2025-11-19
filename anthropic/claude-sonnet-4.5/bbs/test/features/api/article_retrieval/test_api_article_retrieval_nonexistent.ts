import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that attempting to retrieve a non-existent article returns appropriate
 * error response.
 *
 * This test validates the API's error handling when requesting an article that
 * doesn't exist in the system. It generates a random UUID that is extremely
 * unlikely to correspond to any existing article and attempts to retrieve it.
 * The API should throw an error indicating the article was not found,
 * demonstrating proper error handling for invalid resource requests.
 *
 * Steps:
 *
 * 1. Generate a valid UUID that doesn't exist in the system
 * 2. Attempt to retrieve article using the non-existent UUID
 * 3. Validate that an error is thrown (expected behavior)
 * 4. Confirm system handles invalid article IDs gracefully
 */
export async function test_api_article_retrieval_nonexistent(
  connection: api.IConnection,
) {
  // Generate a random UUID that doesn't exist in the system
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve the non-existent article and expect an error
  await TestValidator.error(
    "should throw error when retrieving non-existent article",
    async () => {
      await api.functional.discussionBoard.articles.at(connection, {
        articleId: nonExistentArticleId,
      });
    },
  );
}
