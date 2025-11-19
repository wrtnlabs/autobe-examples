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
 * Test successful article creation by an authenticated contributor.
 *
 * This test validates the complete workflow of contributor article creation:
 *
 * 1. Register a new contributor account with unique credentials
 * 2. Authenticate the contributor to establish JWT token context
 * 3. Create an article in draft status with valid content
 * 4. Validate article properties including ID generation, timestamps, and default
 *    values
 * 5. Verify article author is correctly set to the creating contributor
 *
 * The test ensures that articles are created with:
 *
 * - Draft status for initial submission
 * - View count starting at 0
 * - Comment count starting at 0
 * - Is_pinned and is_locked set to false
 * - Correct author attribution
 * - Proper timestamp recording for created_at and updated_at
 */
export async function test_api_article_creation_by_contributor(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorUsername = RandomGenerator.alphaNumeric(8);
  const contributorPassword = "SecurePass123!";

  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: contributorUsername,
        password: contributorPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor registered successfully",
    contributor.id !== null,
  );
  TestValidator.equals(
    "contributor email matches",
    contributor.email,
    contributorEmail,
  );
  TestValidator.equals(
    "contributor username matches",
    contributor.username,
    contributorUsername,
  );
  TestValidator.predicate(
    "contributor account is active",
    contributor.account_status === "active",
  );

  // Step 2: Create an article with valid content
  const articleTitle = RandomGenerator.paragraph({ sentences: 2 });
  const articleContent = RandomGenerator.content({ paragraphs: 3 });
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          categoryId: categoryId,
          href: "https://example.com/articles/create",
          referrer: "https://example.com/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Validate article properties
  TestValidator.predicate(
    "article ID is generated",
    article.id !== null && article.id.length > 0,
  );
  TestValidator.equals(
    "article title matches input",
    article.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content matches input",
    article.content,
    articleContent,
  );
  TestValidator.equals("article status is draft", article.status, "draft");
  TestValidator.predicate(
    "article author matches contributor",
    article.author.id === contributor.id,
  );
  TestValidator.equals(
    "article author username matches",
    article.author.username,
    contributorUsername,
  );

  // Step 4: Validate default values
  TestValidator.equals("view count starts at 0", article.view_count, 0);
  TestValidator.equals("comment count starts at 0", article.comment_count, 0);
  TestValidator.predicate("is_pinned is false", article.is_pinned === false);
  TestValidator.predicate("is_locked is false", article.is_locked === false);

  // Step 5: Validate timestamps
  TestValidator.predicate("created_at is set", article.created_at !== null);
  TestValidator.predicate("updated_at is set", article.updated_at !== null);
  TestValidator.predicate(
    "published_at is null for draft",
    article.published_at === null || article.published_at === undefined,
  );
  TestValidator.predicate(
    "deleted_at is null for active article",
    article.deleted_at === null || article.deleted_at === undefined,
  );

  // Step 6: Validate category reference
  TestValidator.predicate("category is set", article.category !== null);
  TestValidator.equals(
    "category ID matches input",
    article.category.id,
    categoryId,
  );

  // Step 7: Validate no approval or editing yet
  TestValidator.predicate(
    "approvedByModerator is null",
    article.approvedByModerator === null ||
      article.approvedByModerator === undefined,
  );
  TestValidator.predicate(
    "lastEditedByContributor is null",
    article.lastEditedByContributor === null ||
      article.lastEditedByContributor === undefined,
  );
  TestValidator.predicate(
    "approval_notes is null",
    article.approval_notes === null || article.approval_notes === undefined,
  );
  TestValidator.predicate(
    "rejection_reason is null",
    article.rejection_reason === null || article.rejection_reason === undefined,
  );
}
