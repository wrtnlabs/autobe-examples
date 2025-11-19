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
 * Test that attempting to update a non-existent article as moderator returns
 * appropriate error response.
 *
 * This test validates that the article moderation endpoint properly checks for
 * article existence before processing update requests. When a moderator
 * attempts to update an article with a non-existent ID, the API should return
 * an error response rather than creating new articles or modifying unintended
 * records.
 *
 * The test creates a moderator account, then attempts to update a non-existent
 * article using a valid UUID that does not correspond to any article. The API
 * should reject this request appropriately.
 *
 * Steps:
 *
 * 1. Create a moderator account via authentication
 * 2. Generate a non-existent article ID (valid UUID format)
 * 3. Attempt to update the non-existent article with moderator permissions
 * 4. Verify that the API returns an error (404 or appropriate error status)
 * 5. Confirm that no article is created or modified
 */
export async function test_api_article_moderator_update_article_not_found(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12) + "A1!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate a non-existent article ID (valid UUID format that doesn't exist)
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to update the non-existent article
  await TestValidator.error(
    "moderator update non-existent article should fail",
    async () => {
      await api.functional.discussionBoard.moderator.articles.updateByModerator(
        connection,
        {
          articleId: nonExistentArticleId,
          body: {
            title: RandomGenerator.paragraph({ sentences: 3 }),
            content: RandomGenerator.content({ paragraphs: 2 }),
            status: "published",
            approval_notes: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    },
  );
}
