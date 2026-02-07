import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test error handling when attempting to retrieve view statistics for a non-existent article.
 * Use a randomly generated UUID that does not correspond to any existing article
 * and verify that the system returns an appropriate 404 error response.
 * This validates the article existence check functionality.
 */
export async function test_api_article_view_statistics_nonexistent_article(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't correspond to any existing article
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve view statistics for the non-existent article
  // Validate that it returns a 404 HTTP error
  await TestValidator.httpError(
    "should return 404 for non-existent article",
    404,
    async () => {
      await api.functional.discussionBoard.articles.view_stats.at(connection, {
        articleId: nonExistentArticleId,
      });
    },
  );
}
