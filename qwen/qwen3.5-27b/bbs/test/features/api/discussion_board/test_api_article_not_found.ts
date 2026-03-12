import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that requesting a non-existent article returns a 404 error.
 *
 * This test verifies that when attempting to retrieve an article with a valid
 * UUID format that doesn't exist in the database, the API properly returns a
 * 404 Not Found error response.
 */
export async function test_api_article_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID that doesn't exist in the database
  const nonExistentArticleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Verify that requesting a non-existent article throws 404 error
  await TestValidator.httpError(
    "non-existent article returns 404",
    404,
    async () =>
      await api.functional.discussionBoard.articles.at(connection, {
        articleId: nonExistentArticleId,
      }),
  );
}
