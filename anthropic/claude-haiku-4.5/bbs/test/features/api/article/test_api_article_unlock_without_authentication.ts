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
 * Test unlock operation without providing valid moderator authentication.
 *
 * This test validates that the article unlock endpoint requires proper
 * moderator authentication and rejects requests without valid JWT tokens. The
 * test attempts to call the unlock API without including authentication
 * credentials and verifies that the system returns a 401 Unauthorized error.
 *
 * Setup flow:
 *
 * 1. Register a contributor and create an article for testing
 * 2. Register a moderator to establish authentication pattern
 * 3. Attempt unlock without authentication on the created article
 * 4. Validate 401 Unauthorized response
 */
export async function test_api_article_unlock_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Register contributor and create article
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "ValidPassword123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Create a category for the article
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Create article that will be targeted for unlock
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: categoryId,
          href: "http://localhost:3000/create-article",
          referrer: "http://localhost:3000/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Register moderator to establish authentication pattern
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "ModeratorPassword123!",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Attempt unlock without authentication
  // Create unauthenticated connection by removing the authorization header
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 5: Validate that unlock without authentication is rejected
  await TestValidator.error(
    "unlock without authentication should fail with 401",
    async () => {
      await api.functional.discussionBoard.moderator.articles.unlock(
        unauthenticatedConnection,
        {
          articleId: article.id,
        },
      );
    },
  );
}
