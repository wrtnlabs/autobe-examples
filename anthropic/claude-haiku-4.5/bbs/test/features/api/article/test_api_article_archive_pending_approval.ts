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
 * Test archival of an article and removal from active listings.
 *
 * This test validates that moderators can archive articles through the archive
 * operation, effectively dismissing them from the approval queue. The test
 * verifies the business logic allowing moderators to manage articles through
 * the archive action with documented reasons for compliance purposes.
 *
 * Workflow:
 *
 * 1. Create moderator account for performing archive action
 * 2. Create contributor account to submit articles
 * 3. Create article draft
 * 4. Moderator archives the article with documented reason
 * 5. Verify article status changed to archived
 * 6. Confirm article properties are updated appropriately
 */
export async function test_api_article_archive_pending_approval(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email should match registration",
    moderator.email,
    moderatorEmail,
  );

  // Step 2: Create contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorUsername = RandomGenerator.alphaNumeric(8);
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        password: "ContributorPass123!",
        username: contributorUsername,
        href: "http://localhost:3000/articles/create",
        referrer: "http://localhost:3000/",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor email should match registration",
    contributor.email,
    contributorEmail,
  );

  // Step 3: Create article
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({ paragraphs: 2 });
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article initial status should be draft",
    article.status,
    "draft",
  );

  // Step 4: Switch to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePassword123!",
      href: "http://localhost:3000/moderator/dashboard",
      referrer: "http://localhost:3000/",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 5: Archive the article with documented reason
  const removalReason = "Article archived as per moderation review process";
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

  // Step 6: Verify article status changed to archived
  TestValidator.equals(
    "archived article status should be archived",
    archivedArticle.status,
    "archived",
  );

  // Step 7: Verify article was modified (updated_at should be different)
  TestValidator.predicate(
    "article should have been updated after archival",
    archivedArticle.updated_at !== article.updated_at,
  );

  // Step 8: Verify article is no longer in active statuses
  TestValidator.notEquals(
    "archived article status should not be draft",
    archivedArticle.status,
    "draft",
  );

  TestValidator.notEquals(
    "archived article status should not be pending_approval",
    archivedArticle.status,
    "pending_approval",
  );

  TestValidator.notEquals(
    "archived article status should not be published",
    archivedArticle.status,
    "published",
  );

  // Step 9: Verify article properties are preserved
  TestValidator.equals(
    "archived article id should match",
    archivedArticle.id,
    article.id,
  );

  TestValidator.equals(
    "archived article title should match",
    archivedArticle.title,
    articleTitle,
  );

  TestValidator.equals(
    "archived article content should match",
    archivedArticle.content,
    articleContent,
  );
}
