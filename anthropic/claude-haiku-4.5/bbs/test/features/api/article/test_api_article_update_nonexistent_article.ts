import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test updating an article that does not exist.
 *
 * This test validates error handling when attempting to update a non-existent
 * article. The API should reject the request with appropriate error status,
 * confirming that the system properly handles operations on resources that
 * don't exist in the database.
 *
 * Steps:
 *
 * 1. Create a moderator account for authentication
 * 2. Generate a non-existent article ID (random UUID)
 * 3. Attempt to update the non-existent article
 * 4. Verify that the API returns an error for the non-existent resource
 */
export async function test_api_article_update_nonexistent_article(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        password: RandomGenerator.alphabets(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate a non-existent article ID (random UUID)
  const nonexistentArticleId = typia.random<string & tags.Format<"uuid">>();

  // Step 3 & 4: Attempt to update the non-existent article and verify error
  await TestValidator.error(
    "updating non-existent article should fail",
    async () => {
      await api.functional.discussionBoard.moderator.articles.update(
        connection,
        {
          articleId: nonexistentArticleId,
          body: {
            title: RandomGenerator.paragraph({ sentences: 3 }),
            body: RandomGenerator.content({ paragraphs: 1 }),
            status: "published",
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    },
  );
}
