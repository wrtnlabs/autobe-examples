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
 * Test unlock operation on an article that is not currently locked.
 *
 * This test validates the system's behavior when attempting to unlock an
 * article that is already in an unlocked state (is_locked = false). The
 * workflow includes:
 *
 * 1. Register a moderator account for unlock operations
 * 2. Register a contributor account to create articles
 * 3. Create an article in draft status (which starts unlocked)
 * 4. Attempt to unlock the article while it's already unlocked
 *
 * The test confirms whether the system allows repeated/redundant unlocks
 * (idempotent behavior) or returns an error indicating the article is not
 * locked. This validates error handling and state validation logic for unlock
 * operations.
 */
export async function test_api_article_unlock_when_article_not_locked(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account for unlock operations
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(8) + "Aa1!";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Register a contributor account to create articles
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = RandomGenerator.alphabets(8) + "Aa1!";
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        password: contributorPassword,
        username: RandomGenerator.alphabets(8),
        href: "http://localhost/register",
        referrer: "http://localhost",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 3: Create an article in draft status (unlocked by default)
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost/article",
          referrer: "http://localhost",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Verify article is not locked initially
  TestValidator.predicate(
    "article should not be locked initially",
    article.is_locked === false,
  );

  // Step 4: Switch to moderator account to attempt unlock on unlocked article
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost/login",
      referrer: "http://localhost",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 5: Attempt to unlock the article that is already unlocked
  // The system should either allow idempotent unlock or return an error
  const unlockedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.unlock(connection, {
      articleId: article.id,
    });
  typia.assert(unlockedArticle);

  // Verify the article remains unlocked
  TestValidator.predicate(
    "article should remain unlocked after unlock operation",
    unlockedArticle.is_locked === false,
  );

  // Verify article ID matches
  TestValidator.equals(
    "unlocked article ID should match original article ID",
    unlockedArticle.id,
    article.id,
  );
}
