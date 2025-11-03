import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test that soft-deleted articles are properly excluded from category article
 * search results.
 *
 * This test validates the business rule that only active articles appear in
 * public category browsing. The test creates a category, creates several
 * articles under that category, soft-deletes some of those articles, then
 * searches for articles in the category and verifies that only non-deleted
 * articles appear in results.
 *
 * Steps:
 *
 * 1. Authenticate as moderator to create and delete articles
 * 2. Create a test category for article organization
 * 3. Create multiple articles under the category (at least 3)
 * 4. Soft-delete some articles (but not all) to create a mixed state
 * 5. Search for articles in the category
 * 6. Validate that only non-deleted articles appear in results
 * 7. Verify all returned articles have null deleted_at timestamps
 */
export async function test_api_category_articles_exclude_deleted(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a test category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create multiple articles under the category
  const article1 =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article1);

  const article2 =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article2);

  const article3 =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article3);

  // Step 4: Soft-delete some articles (article1 and article3)
  await api.functional.discussionBoard.moderator.articles.erase(connection, {
    articleId: article1.id,
  });

  await api.functional.discussionBoard.moderator.articles.erase(connection, {
    articleId: article3.id,
  });

  // Step 5: Search for articles in the category
  const searchResult =
    await api.functional.discussionBoard.categories.articles.index(connection, {
      categorySlug: category.slug,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchResult);

  // Step 6: Validate that only non-deleted articles appear in results
  TestValidator.equals(
    "only one active article should be returned",
    searchResult.data.length,
    1,
  );

  // Step 7: Verify the returned article is article2 (the non-deleted one)
  TestValidator.equals(
    "returned article should be article2",
    searchResult.data[0].id,
    article2.id,
  );

  // Step 8: Verify deleted_at is null for the returned article
  TestValidator.equals(
    "returned article should not be deleted",
    searchResult.data[0].deleted_at,
    null,
  );
}
