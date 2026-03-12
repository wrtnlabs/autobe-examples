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
 * Test that requesting a soft-deleted or non-existent article returns a 404 error.
 *
 * This test validates the soft-delete behavior where articles with deleted_at
 * timestamp are filtered out and treated as non-existent. Since creation and
 * deletion APIs are not available, we test with a random UUID that doesn't exist,
 * which produces the same 404 response as a soft-deleted article.
 */
export async function test_api_article_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for a non-existent article
  const articleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test that requesting non-existent/soft-deleted article throws 404 error
  await TestValidator.httpError(
    "soft-deleted article returns 404",
    404,
    async () =>
      await api.functional.discussionBoard.articles.at(connection, {
        articleId,
      }),
  );
}
