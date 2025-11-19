import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that locking an article prevents new comments while preserving existing
 * comments and visibility.
 *
 * This test validates the article locking mechanism by:
 *
 * 1. Setting up moderator and contributor accounts
 * 2. Creating an article with initial comments
 * 3. Locking the article via moderator action
 * 4. Verifying the lock prevents new comments
 * 5. Confirming existing comments remain visible
 *
 * The lock feature allows moderators to end discussion on sensitive or resolved
 * topics while maintaining the historical record and article visibility.
 */
export async function test_api_article_lock_prevents_new_comments(
  connection: api.IConnection,
) {
  // Step 1: Authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPassword123!",
        username: RandomGenerator.alphaNumeric(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Authenticate contributor and create article
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        password: "ContributorPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        href: "http://localhost/",
        referrer: "http://localhost/",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Get a category ID for article creation
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create article as contributor
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 8,
          }),
          categoryId: categoryId,
          href: "http://localhost/articles/new",
          referrer: "http://localhost/",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  const articleStatusBeforeLock = article.status;

  // Step 4: Post multiple comments on the article
  const comment1: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment1);

  const comment2: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment2);

  TestValidator.predicate(
    "existing comments created before lock",
    comment1.id !== comment2.id,
  );

  // Step 5: Switch to moderator and lock the article
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "http://localhost/login",
      referrer: "http://localhost/",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const lockedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.lock(connection, {
      articleId: article.id,
    });
  typia.assert(lockedArticle);

  // Step 6: Verify article is locked and status preserved
  TestValidator.equals(
    "article is_locked field set to true",
    lockedArticle.is_locked,
    true,
  );
  TestValidator.equals(
    "article ID remains the same",
    lockedArticle.id,
    article.id,
  );
  TestValidator.equals(
    "article status preserved after locking",
    lockedArticle.status,
    articleStatusBeforeLock,
  );

  // Step 7: Switch back to contributor and attempt to post new comment
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: "ContributorPassword123!",
      href: "http://localhost/login",
      referrer: "http://localhost/",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  // Attempt to post comment on locked article should fail
  await TestValidator.error(
    "cannot post new comment on locked article",
    async () => {
      await api.functional.discussionBoard.contributor.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            content: RandomGenerator.paragraph({
              sentences: 4,
              wordMin: 3,
              wordMax: 8,
            }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );

  // Step 8: Verify existing comments are still readable
  TestValidator.predicate(
    "existing comments have content preserved",
    comment1.content.length > 0 && comment2.content.length > 0,
  );
  TestValidator.equals("comment 1 not deleted", comment1.is_deleted, false);
  TestValidator.equals("comment 2 not deleted", comment2.is_deleted, false);
}
