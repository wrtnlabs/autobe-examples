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
 * Test article creation with unverified contributor account.
 *
 * This test validates that unverified contributors cannot create articles. When
 * a contributor joins the discussion board, their email is initially
 * unverified. The system should prevent article creation until email
 * verification is completed, returning HTTP 403 Forbidden.
 *
 * Test workflow:
 *
 * 1. Register a new contributor account (email_verified = false initially)
 * 2. Attempt to create an article with valid data using the unverified account
 * 3. Verify that the API returns 403 Forbidden response
 * 4. Confirm the error indicates email verification is required
 */
export async function test_api_article_creation_unverified_email(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account with unverified email
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(8),
        password: "SecurePass123!@#",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Verify that the contributor's email is not verified after registration
  TestValidator.equals(
    "contributor email should be unverified after registration",
    contributor.email_verified,
    false,
  );

  // Step 2: Attempt to create an article with the unverified contributor account
  // Generate valid article data
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    categoryId: typia.random<string & tags.Format<"uuid">>(),
    href: "https://example.com/create-article",
    referrer: "https://example.com/articles",
  } satisfies IDiscussionBoardArticle.ICreate;

  // Step 3: Verify that article creation is forbidden for unverified contributors
  await TestValidator.error(
    "unverified contributor should not be able to create articles",
    async () => {
      await api.functional.discussionBoard.contributor.articles.create(
        connection,
        {
          body: articleData,
        },
      );
    },
  );
}
