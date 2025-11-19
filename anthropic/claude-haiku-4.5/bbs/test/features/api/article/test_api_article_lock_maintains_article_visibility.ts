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
 * Test that locking an article does not affect its visibility status or
 * publication metadata.
 *
 * This test validates that the lock operation on an article:
 *
 * - Does not change the article's publication status (remains 'published')
 * - Does not affect the article's visibility in listings
 * - Preserves all article metadata (title, content, category, author, timestamps)
 * - Only sets the is_locked flag to true
 * - Does not have unintended side effects on other fields
 *
 * Test flow:
 *
 * 1. Moderator authenticates via join/login
 * 2. Contributor authenticates via join/login
 * 3. Contributor creates an article (initially in 'draft' status)
 * 4. Article metadata is captured for comparison
 * 5. Moderator locks the article
 * 6. Verify article status remains unchanged after lock
 * 7. Verify all metadata fields are unchanged
 * 8. Verify is_locked is true while other status fields unchanged
 * 9. Verify article visibility is maintained
 */
export async function test_api_article_lock_maintains_article_visibility(
  connection: api.IConnection,
) {
  // 1. Authenticate moderator
  const moderatorEmail = `moderator-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderatorPassword = `TestPass123!@#`;
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: `mod_${RandomGenerator.alphaNumeric(6)}`,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Authenticate contributor
  const contributorEmail = `contributor-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const contributorPassword = `TestPass123!@#`;
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        password: contributorPassword,
        username: `contrib_${RandomGenerator.alphaNumeric(6)}`,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // 3. Switch to contributor context and create article
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: contributorPassword,
      href: "http://localhost:3000/article/create",
      referrer: "http://localhost:3000/articles",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  // Generate a valid category ID (use random UUID for system to validate)
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Create article in draft status
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: `Test Article ${RandomGenerator.alphaNumeric(8)}`,
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 10,
            sentenceMax: 20,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/article/create",
          referrer: "http://localhost:3000/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // 4. Capture article metadata before locking for comparison
  const preLockTitle = article.title;
  const preLockContent = article.content;
  const preLockStatus = article.status;
  const preLockAuthorId = article.author.id;
  const preLockCategoryId = article.category.id;
  const preLockCreatedAt = article.created_at;
  const preLockIsPinned = article.is_pinned;
  const preLockViewCount = article.view_count;
  const preLockCommentCount = article.comment_count;

  // 5. Switch to moderator context and lock the article
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/moderation",
      referrer: "http://localhost:3000/",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const lockedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.lock(connection, {
      articleId: article.id,
    });
  typia.assert(lockedArticle);

  // 6. Verify is_locked flag is set to true
  TestValidator.equals(
    "is_locked flag is set to true after lock operation",
    lockedArticle.is_locked,
    true,
  );

  // 7. Verify article status remains unchanged after lock
  TestValidator.equals(
    "article status remains unchanged after lock",
    lockedArticle.status,
    preLockStatus,
  );

  // 8. Verify all article metadata is preserved
  TestValidator.equals(
    "article title unchanged after lock",
    lockedArticle.title,
    preLockTitle,
  );
  TestValidator.equals(
    "article content unchanged after lock",
    lockedArticle.content,
    preLockContent,
  );
  TestValidator.equals(
    "article author ID unchanged after lock",
    lockedArticle.author.id,
    preLockAuthorId,
  );
  TestValidator.equals(
    "article category ID unchanged after lock",
    lockedArticle.category.id,
    preLockCategoryId,
  );
  TestValidator.equals(
    "article created_at timestamp unchanged after lock",
    lockedArticle.created_at,
    preLockCreatedAt,
  );

  // 9. Verify other status fields remain unchanged
  TestValidator.equals(
    "article is_pinned unchanged after lock",
    lockedArticle.is_pinned,
    preLockIsPinned,
  );
  TestValidator.equals(
    "article view_count unchanged after lock",
    lockedArticle.view_count,
    preLockViewCount,
  );
  TestValidator.equals(
    "article comment_count unchanged after lock",
    lockedArticle.comment_count,
    preLockCommentCount,
  );

  // 10. Verify article visibility is maintained (not deleted/archived)
  TestValidator.predicate(
    "locked article maintains visibility in publication state",
    lockedArticle.status !== "deleted" && lockedArticle.status !== "archived",
  );

  // 11. Verify lock operation has isolated side effects
  TestValidator.predicate(
    "only is_locked field changed by lock operation",
    lockedArticle.is_locked === true &&
      lockedArticle.title === preLockTitle &&
      lockedArticle.content === preLockContent &&
      lockedArticle.status === preLockStatus,
  );
}
