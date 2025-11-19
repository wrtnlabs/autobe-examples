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
 * Test that unpinning an article that is not currently pinned is idempotent.
 *
 * This test validates the edge case where a moderator attempts to unpin an
 * article that is already in an unpinned state (is_pinned = false). The test
 * verifies that the unpin operation succeeds gracefully and the article remains
 * unpinned, demonstrating idempotent behavior.
 *
 * Test flow:
 *
 * 1. Moderator registers and authenticates for moderation permissions
 * 2. Contributor registers and authenticates to create articles
 * 3. Contributor creates a new article (defaults to unpinned status)
 * 4. Moderator attempts to unpin the already-unpinned article
 * 5. Validate that the operation succeeds with is_pinned remaining false
 * 6. Confirm idempotent behavior - unpinning already-unpinned is safe
 */
export async function test_api_article_unpin_unpinned_article_idempotent(
  connection: api.IConnection,
) {
  // Step 1: Moderator registration and authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "Password@123",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Authenticate as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "Password@123",
      href: "http://localhost/moderator/login",
      referrer: "http://localhost/moderator",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 2: Contributor registration and authentication
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        password: "Password@123",
        username: RandomGenerator.alphabets(10),
        href: "http://localhost/contributor/join",
        referrer: "http://localhost/contributor",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Authenticate as contributor
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: "Password@123",
      href: "http://localhost/contributor/login",
      referrer: "http://localhost/contributor",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  // Step 3: Create an article (defaults to unpinned status)
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Economic Policy Analysis: Fiscal Reform Considerations",
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 8,
            sentenceMax: 12,
            wordMin: 4,
            wordMax: 8,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost/articles/create",
          referrer: "http://localhost/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Verify article starts in unpinned state
  TestValidator.equals(
    "article should be unpinned by default",
    article.is_pinned,
    false,
  );

  // Step 4: Switch back to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "Password@123",
      href: "http://localhost/moderator/login",
      referrer: "http://localhost/moderator",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 5: Attempt to unpin the already-unpinned article
  const unpinResult: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.unpin(connection, {
      articleId: article.id,
    });
  typia.assert(unpinResult);

  // Step 6: Validate idempotent behavior
  TestValidator.equals(
    "unpinned article should remain unpinned after unpin operation",
    unpinResult.is_pinned,
    false,
  );

  TestValidator.equals(
    "article ID should match original article",
    unpinResult.id,
    article.id,
  );

  // Test idempotency - attempt to unpin again
  const secondUnpinResult: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.unpin(connection, {
      articleId: article.id,
    });
  typia.assert(secondUnpinResult);

  TestValidator.equals(
    "second unpin should also result in unpinned state",
    secondUnpinResult.is_pinned,
    false,
  );

  TestValidator.equals(
    "repeated unpin operations should be idempotent",
    secondUnpinResult.id,
    article.id,
  );
}
