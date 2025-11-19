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

export async function test_api_article_unpin_article_visibility_unchanged(
  connection: api.IConnection,
) {
  // Step 1: Moderator registers and authenticates
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPass123!";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Contributor registers and authenticates
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "TestPass456!";
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        password: contributorPassword,
        username: RandomGenerator.alphabets(10),
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 3: Contributor creates an article
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
            sentenceMax: 8,
            wordMin: 3,
            wordMax: 7,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "https://example.com/article",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Verify article is in draft status initially
  TestValidator.equals("article status is draft", article.status, "draft");
  TestValidator.predicate(
    "article is not pinned initially",
    !article.is_pinned,
  );

  // Step 4: Switch to moderator and pin the article
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const pinnedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.pin(connection, {
      articleId: article.id,
    });
  typia.assert(pinnedArticle);

  // Verify pinning was successful
  TestValidator.predicate(
    "article is pinned after pin operation",
    pinnedArticle.is_pinned,
  );

  // Step 5: Unpin the article
  const unpinnedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.unpin(connection, {
      articleId: article.id,
    });
  typia.assert(unpinnedArticle);

  // Step 6: Verify article is no longer pinned
  TestValidator.predicate(
    "article is not pinned after unpin",
    !unpinnedArticle.is_pinned,
  );

  // Step 7: Verify article visibility and status are unchanged
  TestValidator.equals(
    "article status remains unchanged after unpin",
    unpinnedArticle.status,
    pinnedArticle.status,
  );
  TestValidator.equals(
    "article title is unchanged",
    unpinnedArticle.title,
    pinnedArticle.title,
  );
  TestValidator.equals(
    "article content is unchanged",
    unpinnedArticle.content,
    pinnedArticle.content,
  );
  TestValidator.equals(
    "article author is unchanged",
    unpinnedArticle.author.id,
    pinnedArticle.author.id,
  );
  TestValidator.equals(
    "article category is unchanged",
    unpinnedArticle.category.id,
    pinnedArticle.category.id,
  );

  // Step 8: Verify metadata is preserved
  TestValidator.equals(
    "article created_at is unchanged",
    unpinnedArticle.created_at,
    pinnedArticle.created_at,
  );
  TestValidator.equals(
    "article view count is unchanged",
    unpinnedArticle.view_count,
    pinnedArticle.view_count,
  );
  TestValidator.equals(
    "article comment count is unchanged",
    unpinnedArticle.comment_count,
    pinnedArticle.comment_count,
  );
  TestValidator.equals(
    "article lock status is unchanged",
    unpinnedArticle.is_locked,
    pinnedArticle.is_locked,
  );

  // Step 9: Verify only is_pinned flag changed
  TestValidator.notEquals(
    "only is_pinned flag differs between pinned and unpinned",
    pinnedArticle.is_pinned,
    unpinnedArticle.is_pinned,
  );
}
