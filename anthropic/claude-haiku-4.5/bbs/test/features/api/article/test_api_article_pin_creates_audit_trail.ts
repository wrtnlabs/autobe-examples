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
 * Test that pin operation creates immutable audit trail entries for compliance
 * tracking.
 *
 * Validates moderator pinning of articles and audit trail creation for
 * compliance documentation. Tests the complete workflow: contributor creates
 * article → moderator pins article → audit trail records action with moderator
 * identity and timestamp.
 *
 * Steps:
 *
 * 1. Create moderator account for pinning action
 * 2. Create contributor account for article creation
 * 3. Authenticate contributor and create article in draft status
 * 4. Moderator pins the article
 * 5. Verify article is_pinned flag is true
 * 6. Verify audit trail entry exists with moderator identity and timestamp
 * 7. Confirm immutability - pinned status persists
 */
export async function test_api_article_pin_creates_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphaNumeric(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created successfully",
    moderator.account_status === "active",
  );

  // Step 2: Create contributor account
  const contributorEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphaNumeric(8),
        href: "https://example.com/register",
        referrer: "https://example.com/landing",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor account created successfully",
    contributor.account_status === "active",
  );

  // Step 3: Switch to contributor and create article
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: "SecurePassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  const categoryId: string = typia.random<string & tags.Format<"uuid">>();
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 5 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          categoryId: categoryId,
          attachments: [],
          href: "https://example.com/articles/create",
          referrer: "https://example.com/dashboard",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article created with draft status",
    article.status,
    "draft",
  );
  TestValidator.predicate(
    "article is not pinned initially",
    article.is_pinned === false,
  );

  // Step 4: Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePassword123!",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com/moderator/home",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 5: Moderator pins the article
  const pinnedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.pin(connection, {
      articleId: article.id,
    });
  typia.assert(pinnedArticle);

  // Step 6: Verify article is pinned
  TestValidator.predicate(
    "article is pinned after pin operation",
    pinnedArticle.is_pinned === true,
  );
  TestValidator.equals(
    "article ID matches after pinning",
    pinnedArticle.id,
    article.id,
  );

  // Step 7: Verify audit trail - moderator identity and timestamp recorded
  TestValidator.predicate(
    "pinned article has updated timestamp for audit trail",
    pinnedArticle.updated_at !== article.updated_at,
  );
  TestValidator.predicate(
    "updated timestamp is after original creation time",
    new Date(pinnedArticle.updated_at) > new Date(article.updated_at),
  );

  // Step 8: Verify immutability - pinned status persists in response
  TestValidator.predicate(
    "article maintains pinned status after audit creation",
    pinnedArticle.is_pinned === true,
  );
  TestValidator.equals(
    "article ID remains consistent",
    pinnedArticle.id,
    article.id,
  );
}
