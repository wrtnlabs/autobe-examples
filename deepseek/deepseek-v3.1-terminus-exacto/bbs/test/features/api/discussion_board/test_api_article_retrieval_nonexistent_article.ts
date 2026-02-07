import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test handling of non-existent articles with proper error response.
 * Attempt to retrieve an article using a valid UUID format that does not exist in the system.
 * Verify that the API returns an appropriate 404 error response with clear error messaging
 * indicating the article was not found. This tests the error handling logic for invalid article IDs.
 */
export async function test_api_article_retrieval_nonexistent_article(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection following Connection Isolation Pattern
  const userConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID format that does not exist in the system
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent article and validate 404 HTTP error
  await TestValidator.httpError(
    "should return 404 for non-existent article",
    404,
    async () => {
      await api.functional.discussionBoard.articles.at(userConnection, {
        articleId: nonExistentArticleId,
      });
    },
  );
}
