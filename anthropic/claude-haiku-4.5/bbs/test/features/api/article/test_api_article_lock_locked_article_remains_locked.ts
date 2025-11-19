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
 * Test that locking an article that is already locked behaves appropriately.
 *
 * This test validates the idempotency of the article lock operation by:
 *
 * 1. Creating a moderator account for lock operations
 * 2. Creating a contributor account for article creation
 * 3. Creating a test article
 * 4. Locking the article for the first time
 * 5. Verifying is_locked becomes true
 * 6. Locking the article again (repeated operation)
 * 7. Verifying is_locked remains true and is not double-locked
 * 8. Confirming the lock operation is idempotent
 */
export async function test_api_article_lock_locked_article_remains_locked(
  connection: api.IConnection,
) {
  // 1. Register moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "Password123!@#",
        username: RandomGenerator.alphabets(12),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Register contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        password: "Password123!@#",
        username: RandomGenerator.alphabets(12),
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // 3. Switch to contributor and create an article
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: "Password123!@#",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article created with is_locked=false",
    article.is_locked,
    false,
  );

  // 4. Switch to moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "Password123!@#",
      href: "http://localhost:3000/moderator/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 5. Lock article first time
  const lockedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.lock(connection, {
      articleId: article.id,
    });
  typia.assert(lockedArticle);
  TestValidator.equals(
    "article is locked after first lock",
    lockedArticle.is_locked,
    true,
  );

  // 6. Lock article second time (idempotent operation)
  const reLockedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.lock(connection, {
      articleId: article.id,
    });
  typia.assert(reLockedArticle);

  // 7. Verify article remains locked
  TestValidator.equals(
    "article remains locked after second lock",
    reLockedArticle.is_locked,
    true,
  );

  // 8. Verify lock state is consistent
  TestValidator.equals(
    "lock state is consistent between operations",
    lockedArticle.is_locked,
    reLockedArticle.is_locked,
  );

  // 9. Verify article ID remains unchanged
  TestValidator.equals(
    "article ID remains consistent",
    article.id,
    reLockedArticle.id,
  );
}
