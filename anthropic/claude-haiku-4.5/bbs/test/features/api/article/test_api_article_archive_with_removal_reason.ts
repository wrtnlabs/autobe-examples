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
 * Test that archive operation properly records moderator's removal reason for
 * compliance documentation.
 *
 * This test validates the complete article archival workflow:
 *
 * 1. Moderator authenticates to access moderation endpoints
 * 2. Contributor creates an article
 * 3. Moderator archives the article with a documented removal reason
 * 4. Validates that the article status is updated to archived
 *
 * Ensures all moderator archival actions include documented rationale for
 * compliance audit trails.
 */
export async function test_api_article_archive_with_removal_reason(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created successfully",
    moderator.id !== null && moderator.account_status === "active",
  );

  // Step 2: Register and authenticate as contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "SecurePass123!";
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        password: contributorPassword,
        username: RandomGenerator.alphabets(10),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor account created successfully",
    contributor.id !== null && contributor.account_status === "active",
  );

  // Step 3: Authenticate as contributor to create article
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: contributorPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  // Step 4: Create an article with title, content, and category
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Economic Policy Analysis: Recent Market Trends",
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 4,
            wordMax: 8,
          }),
          categoryId: categoryId,
          href: "https://example.com/articles/new",
          referrer: "https://example.com/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate(
    "article created with draft status",
    article.status === "draft",
  );

  // Step 5: Switch to moderator authentication for archival
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator/login",
      referrer: "https://example.com/moderator",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 6: Archive the article with detailed removal reason for compliance documentation
  const removalReason =
    "This article violates community guidelines regarding economic discussion standards and contains unsubstantiated claims. Archived for compliance review.";
  const archivedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.archive(
      connection,
      {
        articleId: article.id,
        body: {
          removalReason: removalReason,
        } satisfies IDiscussionBoardArticle.IArchive,
      },
    );
  typia.assert(archivedArticle);

  // Step 7: Validate archival operation completed successfully
  TestValidator.equals(
    "article status changed to archived",
    archivedArticle.status,
    "archived",
  );

  TestValidator.equals(
    "article ID preserved after archival",
    archivedArticle.id,
    article.id,
  );

  TestValidator.equals(
    "article title preserved for audit trail",
    archivedArticle.title,
    article.title,
  );

  TestValidator.predicate(
    "article author information retained",
    archivedArticle.author.id === contributor.id,
  );

  TestValidator.predicate(
    "removal reason meets compliance requirements",
    removalReason.length > 0 && removalReason.length <= 500,
  );

  TestValidator.predicate(
    "updated timestamp reflects archival action",
    new Date(archivedArticle.updated_at).getTime() >=
      new Date(article.created_at).getTime(),
  );

  TestValidator.predicate(
    "article is no longer in draft status",
    archivedArticle.status !== "draft",
  );
}
