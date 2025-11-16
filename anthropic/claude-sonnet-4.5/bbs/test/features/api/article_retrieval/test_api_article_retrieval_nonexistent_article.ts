import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test error handling when attempting to retrieve a non-existent article.
 *
 * This test validates that the discussion board API properly handles requests
 * for articles that don't exist in the system. It verifies that attempting to
 * retrieve an article with a valid UUID format but non-existent ID results in
 * an appropriate error response rather than returning data or crashing.
 *
 * Test flow:
 *
 * 1. Generate a random UUID that doesn't correspond to any existing article
 * 2. Attempt to retrieve an article using this non-existent UUID
 * 3. Verify that the API call fails with an error (expecting 404 Not Found or
 *    similar)
 * 4. Ensure no article data is returned for the non-existent ID
 *
 * This test ensures the system handles missing resources gracefully and
 * provides appropriate error responses for client applications to handle.
 */
export async function test_api_article_retrieval_nonexistent_article(
  connection: api.IConnection,
) {
  // Generate a random UUID that is highly unlikely to exist in the database
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve an article with the non-existent ID
  // This should fail and throw an error
  await TestValidator.error(
    "should fail when retrieving non-existent article",
    async () => {
      await api.functional.discussionBoard.articles.at(connection, {
        articleId: nonExistentArticleId,
      });
    },
  );
}
