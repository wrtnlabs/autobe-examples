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
 * Test successful article unlock operation by a moderator.
 *
 * This test validates the complete workflow of unlocking an article:
 *
 * 1. Register a moderator account
 * 2. Register a contributor account
 * 3. Contributor creates an article in draft status
 * 4. Article transitions to published status (simulated as locked)
 * 5. Moderator unlocks the article
 * 6. Verify that is_locked is set to false
 * 7. Verify article properties remain unchanged except is_locked
 * 8. Confirm the article is now open for new comments
 */
export async function test_api_article_unlock_by_moderator_success(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123!";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator created successfully",
    moderator.account_status,
    "active",
  );

  // Step 2: Register contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "ContributorPass123!";
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        password: contributorPassword,
        username: RandomGenerator.alphabets(10),
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/login",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor created successfully",
    contributor.account_status,
    "active",
  );

  // Step 3: Authenticate as contributor and create article
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: contributorPassword,
      href: "http://localhost:3000/articles",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  // Create an article in draft status
  const categoryId = typia.random<string & tags.Format<"uuid">>();
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
            paragraphs: 3,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/new",
          referrer: "http://localhost:3000/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article created in draft status",
    article.status,
    "draft",
  );

  // Step 4: Authenticate as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/moderator/dashboard",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 5: Moderator unlocks the article
  const unlockedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.unlock(connection, {
      articleId: article.id,
    });
  typia.assert(unlockedArticle);

  // Step 6: Verify that is_locked is set to false
  TestValidator.equals("article is unlocked", unlockedArticle.is_locked, false);

  // Step 7: Verify article properties remain unchanged except is_locked
  TestValidator.equals(
    "article title unchanged",
    unlockedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article content unchanged",
    unlockedArticle.content,
    article.content,
  );
  TestValidator.equals("article id unchanged", unlockedArticle.id, article.id);
  TestValidator.equals(
    "article author unchanged",
    unlockedArticle.author.id,
    article.author.id,
  );

  // Step 8: Confirm article is now accessible with unlock status
  TestValidator.predicate(
    "article unlock successful",
    !unlockedArticle.is_locked,
  );
}
