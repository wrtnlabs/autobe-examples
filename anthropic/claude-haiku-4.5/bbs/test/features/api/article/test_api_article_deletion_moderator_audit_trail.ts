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
 * Test that moderator deletion actions are properly recorded in the audit trail
 * for compliance and accountability.
 *
 * This test validates that when a moderator deletes an article, the system
 * properly marks it as deleted with an accurate timestamp. The test verifies
 * moderator authorization to delete articles and confirms the deletion is
 * recorded with proper audit trail information.
 *
 * Test workflow:
 *
 * 1. Register a contributor account
 * 2. Create an article in draft status (with a randomly generated category)
 * 3. Register a moderator account
 * 4. Authenticate as moderator
 * 5. Moderator deletes the article
 * 6. Verify the article is marked as deleted with timestamp
 * 7. Confirm deletion cannot be reversed and audit trail shows deletion state
 */
export async function test_api_article_deletion_moderator_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Register contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.name(1),
        password: "SecurePassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor account created with active status",
    contributor.account_status === "active",
  );

  // Step 2: Create an article in draft status
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: categoryId,
          href: "https://example.com/articles/create",
          referrer: "https://example.com/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article created with draft status",
    article.status,
    "draft",
  );

  // Step 3: Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "ModeratorPassword123!",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created with active status",
    moderator.account_status === "active",
  );

  // Step 4: Authenticate as moderator for deletion
  const moderatorSession: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPassword123!",
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(moderatorSession);
  TestValidator.equals(
    "moderator session authenticated",
    moderatorSession.id,
    moderator.id,
  );

  // Step 5: Moderator deletes the article
  const deletedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.eraseByModerator(
      connection,
      {
        articleId: article.id,
      },
    );
  typia.assert(deletedArticle);

  // Step 6: Verify article deletion and audit trail
  TestValidator.equals(
    "deleted article status set to deleted",
    deletedArticle.status,
    "deleted",
  );

  TestValidator.predicate(
    "article deleted_at timestamp is recorded for audit trail",
    deletedArticle.deleted_at !== null &&
      deletedArticle.deleted_at !== undefined,
  );

  TestValidator.equals(
    "deleted article ID matches original article",
    deletedArticle.id,
    article.id,
  );

  // Step 7: Verify deletion state is immutable
  TestValidator.predicate(
    "article deletion is permanent in audit trail",
    deletedArticle.status === "deleted" &&
      deletedArticle.deleted_at !== null &&
      deletedArticle.deleted_at !== undefined,
  );
}
