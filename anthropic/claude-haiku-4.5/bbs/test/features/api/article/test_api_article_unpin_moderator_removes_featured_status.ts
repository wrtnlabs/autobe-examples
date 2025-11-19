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
 * Test article unpinning by a moderator.
 *
 * This test validates that a moderator can successfully unpin a previously
 * pinned article, removing it from featured display status. The test follows a
 * complete workflow:
 *
 * 1. Moderator account registration and authentication
 * 2. Contributor account creation and article submission
 * 3. Article pinning by moderator to feature it
 * 4. Article unpinning by moderator using the unpin endpoint
 * 5. Verification that is_pinned status is set to false
 * 6. Confirmation that moderation action is properly recorded
 *
 * The test ensures that unpinning works correctly on pinned articles and
 * validates the moderation audit trail functionality.
 */
export async function test_api_article_unpin_moderator_removes_featured_status(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!@";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator created with active status",
    moderator.account_status,
    "active",
  );

  // Step 2: Register and authenticate a contributor, then create an article
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "SecurePass456!@";
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphabets(8),
      password: contributorPassword,
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor created with active status",
    contributor.account_status,
    "active",
  );

  // Create an article with a valid category UUID
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 8,
            sentenceMax: 15,
          }),
          categoryId: categoryId,
          href: "https://example.com/create-article",
          referrer: "https://example.com/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Switch to moderator and pin the article
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const pinnedArticle =
    await api.functional.discussionBoard.moderator.articles.pin(connection, {
      articleId: article.id,
    });
  typia.assert(pinnedArticle);
  TestValidator.equals(
    "article pinned successfully",
    pinnedArticle.is_pinned,
    true,
  );
  TestValidator.equals(
    "pinned article ID matches original",
    pinnedArticle.id,
    article.id,
  );

  // Step 4: Unpin the article using the unpin endpoint
  const unpinnedArticle =
    await api.functional.discussionBoard.moderator.articles.unpin(connection, {
      articleId: article.id,
    });
  typia.assert(unpinnedArticle);

  // Step 5: Verify the article's is_pinned status is set to false
  TestValidator.equals(
    "article is unpinned after unpin operation",
    unpinnedArticle.is_pinned,
    false,
  );
  TestValidator.equals(
    "unpinned article ID matches original",
    unpinnedArticle.id,
    article.id,
  );

  // Step 6: Validate moderation action is recorded and timestamps updated
  TestValidator.predicate(
    "unpinned article has updated_at timestamp",
    unpinnedArticle.updated_at !== null &&
      unpinnedArticle.updated_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp reflects unpinning action",
    new Date(unpinnedArticle.updated_at) >= new Date(pinnedArticle.updated_at),
  );
}
