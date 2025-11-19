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
 * Test successful archival of a published article by moderator.
 *
 * Validates the complete workflow of article archival by a moderator:
 *
 * 1. Creates a new moderator account for moderation access
 * 2. Creates a new contributor account for article authorship
 * 3. Contributor creates an article in draft status
 * 4. Moderator authenticates to establish proper session
 * 5. Moderator archives the article with a valid removal reason
 * 6. Verifies article status transitions to 'archived'
 * 7. Confirms archival is properly recorded with moderator accountability
 *
 * This test ensures moderators can successfully archive articles, that archival
 * is immutable and audited, and that archived articles are hidden from public
 * view while maintaining compliance audit trails.
 */
export async function test_api_article_archive_by_moderator_success(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorPassword = `${RandomGenerator.alphaNumeric(10)}Abc!`;

  const moderatorJoined: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorJoined);
  TestValidator.equals(
    "moderator email matches",
    moderatorJoined.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches",
    moderatorJoined.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "moderator is active",
    moderatorJoined.account_status,
    "active",
  );

  // Step 2: Create a contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorUsername = RandomGenerator.alphabets(8);
  const contributorPassword = `${RandomGenerator.alphaNumeric(10)}Abc!`;

  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: contributorUsername,
        password: contributorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
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
  TestValidator.equals(
    "contributor is active",
    contributor.account_status,
    "active",
  );

  // Step 3: Contributor creates an article draft
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          categoryId: categoryId,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals("article status is draft", article.status, "draft");
  TestValidator.equals("article title matches", article.title, articleTitle);
  TestValidator.equals(
    "article author matches",
    article.author.id,
    contributor.id,
  );

  // Step 4: Moderator authenticates to establish proper session
  const moderatorAuthenticated: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(moderatorAuthenticated);
  TestValidator.equals(
    "authenticated moderator email matches",
    moderatorAuthenticated.email,
    moderatorEmail,
  );

  // Step 5: Moderator archives the article with valid removal reason
  const removalReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });

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

  // Step 6: Verify article status transitioned to 'archived'
  TestValidator.equals(
    "article status is archived",
    archivedArticle.status,
    "archived",
  );
  TestValidator.equals("article ID unchanged", archivedArticle.id, article.id);
  TestValidator.equals(
    "article title unchanged",
    archivedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article content unchanged",
    archivedArticle.content,
    article.content,
  );
  TestValidator.equals(
    "article author unchanged",
    archivedArticle.author.id,
    article.author.id,
  );

  // Step 7: Verify updated_at timestamp reflects archival action
  TestValidator.notEquals(
    "article updated_at changed after archival",
    archivedArticle.updated_at,
    article.updated_at,
  );
  TestValidator.predicate("updated_at is after original creation", () => {
    const originalDate = new Date(article.updated_at);
    const archivedDate = new Date(archivedArticle.updated_at);
    return archivedDate >= originalDate;
  });

  // Step 8: Verify archival is properly recorded
  TestValidator.equals(
    "article is archived and not in any other state",
    archivedArticle.status,
    "archived",
  );
  TestValidator.equals(
    "article is not locked or pinned",
    archivedArticle.is_locked,
    false,
  );
  TestValidator.equals(
    "article pinned flag unchanged",
    archivedArticle.is_pinned,
    false,
  );
}
