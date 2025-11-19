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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";

/**
 * Test that a contributor can reassign their draft article to a different
 * category.
 *
 * This test validates the complete workflow of category reassignment:
 *
 * 1. Authenticate as a contributor
 * 2. Retrieve available categories
 * 3. Create an article with initial category assignment
 * 4. Update the article category to a different category
 * 5. Verify category reference is updated correctly and persisted
 */
export async function test_api_article_contributor_update_category_assignment(
  connection: api.IConnection,
) {
  // 1. Authenticate as contributor
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor authenticated successfully",
    () => contributor.id !== undefined && contributor.email_verified === false,
  );

  // 2. Retrieve available categories
  const categoriesResponse: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.categories.index(connection);
  typia.assert(categoriesResponse);

  TestValidator.predicate(
    "at least two categories available",
    () => categoriesResponse.data.length >= 2,
  );

  const initialCategory = categoriesResponse.data[0];
  const newCategory = categoriesResponse.data[1];

  TestValidator.predicate(
    "categories are different",
    () => initialCategory.id !== newCategory.id,
  );

  // 3. Create article with initial category assignment
  const createArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    categoryId: initialCategory.id,
    href: "https://example.com/create-article",
    referrer: "https://example.com/articles",
  };

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: createArticleBody satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(createdArticle);

  TestValidator.equals(
    "article created with initial category",
    createdArticle.category.id,
    initialCategory.id,
  );
  TestValidator.equals(
    "article status is draft",
    createdArticle.status,
    "draft",
  );

  // 4. Update article category to different category
  const updateArticleBody = {
    article_category_id: newCategory.id,
  };

  const updatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: createdArticle.id,
        body: updateArticleBody satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);

  // 5. Verify category reference updated correctly
  TestValidator.equals(
    "article category updated to new category",
    updatedArticle.category.id,
    newCategory.id,
  );

  TestValidator.notEquals(
    "article category different from initial category",
    updatedArticle.category.id,
    initialCategory.id,
  );

  TestValidator.equals(
    "category code matches new category",
    updatedArticle.category.code,
    newCategory.code,
  );

  // 6. Verify persistence - category change is reflected in system
  TestValidator.equals(
    "updated article maintains same ID",
    updatedArticle.id,
    createdArticle.id,
  );

  TestValidator.equals(
    "updated article title unchanged",
    updatedArticle.title,
    createdArticle.title,
  );

  TestValidator.equals(
    "updated article content unchanged",
    updatedArticle.content,
    createdArticle.content,
  );

  TestValidator.predicate(
    "article remains in draft status after category update",
    () => updatedArticle.status === "draft",
  );
}
