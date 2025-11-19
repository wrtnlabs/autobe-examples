import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieving article with non-existent ID.
 *
 * This test validates that attempting to retrieve an article using a UUID that
 * does not exist in the database returns HTTP 404 Not Found. It ensures the API
 * properly handles requests for non-existent resources and returns appropriate
 * error responses.
 *
 * Test flow:
 *
 * 1. Generate a random non-existent UUID for an article ID
 * 2. Attempt to retrieve the article using the non-existent ID
 * 3. Verify that an HttpError is thrown with status 404
 * 4. Confirm that the error indicates the article does not exist
 */
export async function test_api_article_retrieval_nonexistent(
  connection: api.IConnection,
) {
  // Generate a random UUID that does not exist in the database
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve article with non-existent ID and verify 404 error
  await TestValidator.httpError(
    "retrieving non-existent article should return 404 not found",
    404,
    async () => {
      return await api.functional.discussionBoard.articles.at(connection, {
        articleId: nonExistentArticleId,
      });
    },
  );
}
