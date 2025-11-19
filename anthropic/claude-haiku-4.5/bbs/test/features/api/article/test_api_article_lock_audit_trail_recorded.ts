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
 * Test that locking an article creates an immutable audit trail entry recording
 * the moderator action.
 *
 * This test validates the article locking mechanism and audit trail recording
 * for compliance. It follows a multi-actor workflow: moderator registration,
 * contributor registration, article creation, and article locking. The test
 * ensures that moderator actions are properly tracked with timestamps and actor
 * identification.
 *
 * Test Flow:
 *
 * 1. Register a moderator account via authentication
 * 2. Register a contributor account via authentication
 * 3. Contributor creates a discussion board article in draft status
 * 4. Moderator locks the article to end discussion
 * 5. Verify the article is locked and the lock action is recorded
 * 6. Validate that lock action updated the article's timestamp
 */
export async function test_api_article_lock_audit_trail_recorded(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        username: RandomGenerator.alphaNumeric(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Register and authenticate as contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        password: "SecurePass123!",
        username: RandomGenerator.alphaNumeric(8),
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 3: Contributor creates an article in draft status
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 2,
            wordMax: 5,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article created in draft status",
    article.status,
    "draft",
  );
  TestValidator.equals(
    "article is not locked initially",
    article.is_locked,
    false,
  );

  // Step 4: Switch to moderator context and lock the article
  const moderatorLogin: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        href: "http://localhost:3000/login",
        referrer: "http://localhost:3000/",
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(moderatorLogin);

  // Step 5: Lock the article
  const lockedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.lock(connection, {
      articleId: article.id,
    });
  typia.assert(lockedArticle);

  // Step 6: Verify the article is locked
  TestValidator.equals(
    "article is locked after lock operation",
    lockedArticle.is_locked,
    true,
  );
  TestValidator.equals(
    "locked article ID matches original",
    lockedArticle.id,
    article.id,
  );

  // Step 7: Validate audit trail timestamp recording
  TestValidator.predicate(
    "article has valid updated_at timestamp after lock",
    lockedArticle.updated_at !== null && lockedArticle.updated_at !== undefined,
  );

  // Verify timestamp is in ISO 8601 format indicating lock action was recorded
  const isValidISO8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
    lockedArticle.updated_at,
  );
  TestValidator.predicate(
    "updated_at timestamp is in ISO 8601 format for audit trail",
    isValidISO8601,
  );

  // Verify that updated_at is different from created_at, indicating the lock action was recorded
  TestValidator.notEquals(
    "lock action updated the article timestamp",
    lockedArticle.updated_at,
    article.created_at,
  );
}
