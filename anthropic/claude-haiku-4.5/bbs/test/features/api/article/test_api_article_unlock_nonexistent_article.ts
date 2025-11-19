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
 * Test unlock operation on a non-existent article.
 *
 * A moderator attempts to unlock an article using a non-existent UUID
 * identifier. The test validates that the system properly returns an error
 * response and confirms that unlock operations fail gracefully when the article
 * does not exist.
 *
 * **Test Workflow:**
 *
 * 1. Register a moderator account to establish authentication
 * 2. Attempt to unlock a non-existent article with a random UUID
 * 3. Validate that the API returns an appropriate error
 * 4. Confirm proper error handling for invalid article references
 */
export async function test_api_article_unlock_nonexistent_article(
  connection: api.IConnection,
) {
  // 1. Register a moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(8) + "A1!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator created successfully",
    moderator.id !== null && moderator.id !== undefined,
  );

  // 2. Generate a non-existent article ID
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to unlock a non-existent article
  await TestValidator.error(
    "unlocking non-existent article should fail",
    async () => {
      await api.functional.discussionBoard.moderator.articles.unlock(
        connection,
        {
          articleId: nonExistentArticleId,
        },
      );
    },
  );

  TestValidator.predicate(
    "error handling validated for non-existent article",
    true,
  );
}
