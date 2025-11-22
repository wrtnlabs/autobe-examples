import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

/**
 * Test the 404 error handling when attempting to retrieve non-existent
 * discussion articles.
 *
 * This test validates that the API properly handles requests for articles that
 * don't exist in the database by returning appropriate HTTP 404 errors with
 * meaningful error messages. The test uses a random UUID that is guaranteed not
 * to exist in the system to ensure the API handles such cases gracefully
 * without exposing internal system details.
 */
export async function test_api_discussion_article_retrieval_not_found(
  connection: api.IConnection,
) {
  // Generate a non-existent UUID for testing
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  // Test that attempting to retrieve a non-existent article returns 404
  await TestValidator.httpError(
    "should return 404 Not Found for non-existent article",
    404,
    async () => {
      return await api.functional.econPoliticalDiscussion.articles.at(
        connection,
        {
          articleId: nonExistentId,
        },
      );
    },
  );
}
