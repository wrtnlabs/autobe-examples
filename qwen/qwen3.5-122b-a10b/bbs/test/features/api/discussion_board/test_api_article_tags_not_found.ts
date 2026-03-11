import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test article tags not found scenario.
 *
 * Test the business error scenario where the requested article does not exist.
 * Call the GET /discussionBoard/articles/{articleId}/tags endpoint with a
 * non-existent article UUID (randomly generated UUID that was never created).
 * Verify that the system returns a 404 Not Found response.
 *
 * This validates the business rule that the system properly handles requests
 * for non-existent articles and provides appropriate error feedback.
 *
 * No authentication or prerequisite operations are needed as this is a public endpoint.
 */
export async function test_api_article_tags_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create public connection (no authentication needed)
  const publicConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID that was never created
  const nonExistentArticleId = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  // Test that requesting tags for non-existent article returns 404
  await TestValidator.httpError(
    "article not found returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.articles.tags.at(publicConnection, {
        articleId: nonExistentArticleId,
      });
    },
  );
}
