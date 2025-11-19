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
 * Test moderator article deletion for draft articles.
 *
 * This test validates that moderators have the authority to delete articles
 * regardless of their current status. The workflow includes:
 *
 * 1. Register a contributor account and authenticate
 * 2. Create an article in draft status
 * 3. Register a moderator account and authenticate
 * 4. Moderator deletes the article
 * 5. Verify the article is marked as deleted with deleted_at timestamp
 * 6. Confirm the deletion was successful
 */
export async function test_api_article_deletion_moderator_pending_approval(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "SecurePass123!Mod";
  const contributorData = {
    email: contributorEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: contributorPassword,
    href: "http://localhost:3000/register",
    referrer: "http://localhost:3000",
  } satisfies IDiscussionBoardContributor.ICreate;

  const contributor = await api.functional.auth.contributor.join(connection, {
    body: contributorData,
  });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor should be active after registration",
    contributor.account_status === "active",
  );

  // Step 2: Create an article in draft status
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          categoryId: categoryId,
          href: "http://localhost:3000/articles/new",
          referrer: "http://localhost:3000/discussion",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate(
    "article should be created in draft status",
    article.status === "draft",
  );
  TestValidator.predicate(
    "article should have valid ID",
    article.id !== null && article.id !== undefined,
  );

  // Step 3: Register and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123!";
  const moderatorData = {
    email: moderatorEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: moderatorPassword,
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator should be active after registration",
    moderator.account_status === "active",
  );

  // Step 4: Login as moderator to switch authentication context
  const moderatorSession = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: "http://localhost:3000/moderator/login",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardModerator.ILogin,
    },
  );
  typia.assert(moderatorSession);
  TestValidator.predicate(
    "moderator login should set authorization token",
    moderatorSession.token.access !== null &&
      moderatorSession.token.access !== undefined,
  );

  // Step 5: Delete the article as moderator
  const deletedArticle =
    await api.functional.discussionBoard.moderator.articles.eraseByModerator(
      connection,
      {
        articleId: article.id,
      },
    );
  typia.assert(deletedArticle);
  TestValidator.predicate(
    "deleted article status should be marked as deleted",
    deletedArticle.status === "deleted",
  );
  TestValidator.predicate(
    "deleted_at timestamp should be set when article is deleted",
    deletedArticle.deleted_at !== null &&
      deletedArticle.deleted_at !== undefined,
  );
  TestValidator.equals(
    "deleted article ID should match original article",
    deletedArticle.id,
    article.id,
  );

  // Step 6: Verify deletion success
  TestValidator.predicate(
    "article should remain deleted permanently",
    deletedArticle.status === "deleted",
  );
}
