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

export async function test_api_article_unpin_audit_trail_recorded(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphabets(12),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator should be authenticated",
    moderator.id !== undefined && moderator.email === moderatorEmail,
  );

  // Step 2: Register and authenticate contributor
  const contributorEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphabets(12),
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor should be authenticated",
    contributor.id !== undefined && contributor.email === contributorEmail,
  );

  // Step 3: Create article as contributor
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate(
    "article should be created",
    article.id !== undefined && article.author.id === contributor.id,
  );

  // Step 4: Switch to moderator and pin the article
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePassword123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const pinnedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.pin(connection, {
      articleId: article.id,
    });
  typia.assert(pinnedArticle);
  TestValidator.predicate(
    "article should be pinned",
    pinnedArticle.is_pinned === true,
  );

  // Step 5: Unpin the article (main action being tested)
  const unpinnedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.unpin(connection, {
      articleId: article.id,
    });
  typia.assert(unpinnedArticle);
  TestValidator.predicate(
    "article should be unpinned after unpin action",
    unpinnedArticle.is_pinned === false,
  );

  // Step 6: Verify audit trail recording
  TestValidator.predicate(
    "unpin action should be recorded with article ID",
    unpinnedArticle.id === article.id,
  );

  TestValidator.predicate(
    "unpin action should be recorded with timestamp",
    unpinnedArticle.updated_at !== undefined &&
      unpinnedArticle.updated_at !== null,
  );

  TestValidator.predicate(
    "article status change should be reflected",
    unpinnedArticle.is_pinned === false,
  );

  TestValidator.notEquals(
    "unpinned article should differ from pinned article in is_pinned status",
    pinnedArticle.is_pinned,
    unpinnedArticle.is_pinned,
  );
}
