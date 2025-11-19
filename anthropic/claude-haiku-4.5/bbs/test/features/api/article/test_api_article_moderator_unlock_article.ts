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
 * Test that a moderator can unlock a locked article to re-enable new comments.
 *
 * This test validates the article locking and unlocking functionality in the
 * discussion board system. It verifies that moderators can lock articles to
 * prevent further comments, and then unlock them to restore normal discussion
 * activity. The test ensures that locking and unlocking are reversible
 * operations for proper article lifecycle management.
 *
 * Test workflow:
 *
 * 1. Create contributor account and authenticate
 * 2. Create article in draft status with required content
 * 3. Transition article to pending_approval for moderator review
 * 4. Create moderator account and authenticate
 * 5. Approve and publish the article
 * 6. Lock the article by setting is_locked to true
 * 7. Verify article is locked (is_locked = true)
 * 8. Unlock the article by setting is_locked to false
 * 9. Verify article is no longer locked and returns to normal state
 */
export async function test_api_article_moderator_unlock_article(
  connection: api.IConnection,
) {
  // Step 1: Create contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Get article categories for article creation
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create article in draft status
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 5,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 6,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article created in draft status",
    article.status,
    "draft",
  );
  TestValidator.equals(
    "article initially not locked",
    article.is_locked,
    false,
  );

  // Step 4: Transition article to pending_approval
  const pendingArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          status: "pending_approval",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(pendingArticle);
  TestValidator.equals(
    "article transitioned to pending_approval",
    pendingArticle.status,
    "pending_approval",
  );

  // Step 5: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: "ModeratorPass123!",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 6: Moderator logs in
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 7: Moderator approves and publishes the article
  const publishedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: article.id,
        body: {
          status: "published",
          approval_notes: "Article meets community guidelines",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(publishedArticle);
  TestValidator.equals(
    "article published by moderator",
    publishedArticle.status,
    "published",
  );

  // Step 8: Moderator locks the article
  const lockedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: article.id,
        body: {
          is_locked: true,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(lockedArticle);
  TestValidator.equals("article is locked", lockedArticle.is_locked, true);
  TestValidator.equals(
    "locked article still published",
    lockedArticle.status,
    "published",
  );

  // Step 9: Verify locked article prevents comments (article is locked)
  TestValidator.predicate(
    "locked article is_locked flag true",
    lockedArticle.is_locked === true,
  );

  // Step 10: Moderator unlocks the article to re-enable comments
  const unlockedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: article.id,
        body: {
          is_locked: false,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(unlockedArticle);
  TestValidator.equals("article is unlocked", unlockedArticle.is_locked, false);
  TestValidator.equals(
    "unlocked article remains published",
    unlockedArticle.status,
    "published",
  );

  // Step 11: Verify unlocked article returns to normal discussion state
  TestValidator.predicate(
    "unlocked article is_locked flag false",
    unlockedArticle.is_locked === false,
  );
  TestValidator.predicate(
    "unlocked article is in published status",
    unlockedArticle.status === "published",
  );

  // Step 12: Verify locking and unlocking are reversible operations
  TestValidator.notEquals(
    "locked and unlocked states are different",
    lockedArticle,
    unlockedArticle,
    (key) => key === "updated_at",
  );
  TestValidator.equals(
    "article ID remains same after lock/unlock",
    lockedArticle.id,
    unlockedArticle.id,
  );
}
