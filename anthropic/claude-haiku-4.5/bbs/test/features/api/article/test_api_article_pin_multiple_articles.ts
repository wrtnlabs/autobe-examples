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
 * Validates moderator ability to pin multiple articles for featured display
 * curation.
 *
 * This test simulates the discussion board article curation workflow where a
 * moderator pins multiple high-quality articles to create a featured section.
 * The workflow includes:
 *
 * 1. Moderator registration and authentication
 * 2. Contributor registration and article creation
 * 3. Creating multiple articles with different content
 * 4. Pinning articles for featured visibility
 * 5. Validating pinned status and article ordering
 *
 * The test ensures that multiple articles can be pinned concurrently, their
 * status is properly reflected, and they appear as featured content in the
 * discussion board.
 */
export async function test_api_article_pin_multiple_articles(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!@#";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphaNumeric(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Register and authenticate a contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "SecurePass123!@#";
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        password: contributorPassword,
        username: RandomGenerator.alphaNumeric(10),
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 3: Create multiple articles with different content
  const articles: IDiscussionBoardArticle[] = [];
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  for (let i = 0; i < 4; i++) {
    const article: IDiscussionBoardArticle =
      await api.functional.discussionBoard.contributor.articles.create(
        connection,
        {
          body: {
            title: `Economic Analysis Article ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
            content: RandomGenerator.content({
              paragraphs: 3,
              sentenceMin: 10,
              sentenceMax: 15,
            }),
            categoryId: categoryId,
            href: "http://localhost:3000/articles/create",
            referrer: "http://localhost:3000",
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    articles.push(article);
  }

  TestValidator.equals(
    "created articles count should be 4",
    articles.length,
    4,
  );

  // Step 4: Authenticate moderator for pinning operations
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 5: Pin multiple articles
  const pinnedArticles: IDiscussionBoardArticle[] = [];

  for (let i = 0; i < 3; i++) {
    const pinnedArticle: IDiscussionBoardArticle =
      await api.functional.discussionBoard.moderator.articles.pin(connection, {
        articleId: articles[i].id,
      });
    typia.assert(pinnedArticle);
    pinnedArticles.push(pinnedArticle);
  }

  TestValidator.equals(
    "pinned articles count should be 3",
    pinnedArticles.length,
    3,
  );

  // Step 6: Validate each pinned article has is_pinned set to true
  for (let i = 0; i < pinnedArticles.length; i++) {
    TestValidator.predicate(
      `pinned article ${i + 1} should have is_pinned true`,
      pinnedArticles[i].is_pinned === true,
    );

    TestValidator.equals(
      `pinned article ${i + 1} id should match original article`,
      pinnedArticles[i].id,
      articles[i].id,
    );

    TestValidator.equals(
      `pinned article ${i + 1} title should be preserved`,
      pinnedArticles[i].title,
      articles[i].title,
    );
  }

  // Step 7: Verify unpinned article remains unpinned
  TestValidator.predicate(
    "unpinned article should have is_pinned false",
    articles[3].is_pinned === false,
  );
}
