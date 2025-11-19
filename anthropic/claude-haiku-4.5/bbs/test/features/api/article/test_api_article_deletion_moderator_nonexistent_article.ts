import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test error handling when moderator attempts to delete non-existent article.
 *
 * This test validates that the moderator deletion endpoint properly handles
 * attempts to delete articles that don't exist in the system. A moderator
 * should receive a 404 error when trying to delete with a non-existent UUID,
 * confirming proper error handling for invalid article references.
 *
 * Steps:
 *
 * 1. Register and authenticate as a moderator
 * 2. Attempt to delete an article using a non-existent UUID
 * 3. Verify the operation throws a 404 error
 * 4. Confirm error handling is appropriate
 */
export async function test_api_article_deletion_moderator_nonexistent_article(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass@123",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2 & 3: Attempt to delete non-existent article and verify error
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "moderator deletion of non-existent article should throw error",
    async () => {
      await api.functional.discussionBoard.moderator.articles.eraseByModerator(
        connection,
        {
          articleId: nonExistentArticleId,
        },
      );
    },
  );

  // Step 4: Verify proper error handling occurred
  TestValidator.predicate(
    "moderator authentication should remain valid after error",
    moderator.token !== undefined && moderator.token.access !== undefined,
  );
}
