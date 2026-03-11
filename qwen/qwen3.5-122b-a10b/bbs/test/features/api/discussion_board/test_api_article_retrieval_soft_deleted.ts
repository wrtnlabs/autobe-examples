import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that requesting a soft-deleted article returns a 404 Not Found response.
 * The test should verify that articles with a non-null deleted_at timestamp are
 * hidden from public views and not accessible through this endpoint. This validates
 * the soft-deletion behavior where deleted articles are preserved for audit purposes
 * but removed from public visibility.
 */
export async function test_api_article_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't exist in the database
  // This simulates the behavior of retrieving a soft-deleted article
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent article
  // This should throw an HttpError with 404 status
  await TestValidator.httpError(
    "soft-deleted article returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.articles.at(connection, {
        articleId: nonExistentArticleId,
      });
    },
  );
}
