import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test the update of a shopping mall article by its original customer author.
 *
 * The test follows this business flow:
 *
 * 1. Register a new customer using the join API and acquire authorization.
 * 2. Create a shopping mall article authored by the registered customer.
 * 3. Create a new article category to associate with the update.
 * 4. Perform an update request changing the article's title, body, and category.
 * 5. Verify the returned article entity reflects the changes correctly, including
 *    updated timestamps and relationships.
 */
export async function test_api_shopping_mall_article_update_by_author_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration: Join
  const customerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "strong-password",
    full_name: RandomGenerator.name(),
    href: "https://example.com/signup",
    referrer: "https://google.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreate,
    });
  typia.assert(customer);

  // 2. Create a new shopping mall article under this customer
  // Create a dummy category first to use for initial article creation
  const initialCategoryCreate = {
    name: RandomGenerator.name(2),
    description: null,
    parent_id: null,
  } satisfies IShoppingMallArticleCategory.ICreate;

  const initialCategory: IShoppingMallArticleCategory =
    await api.functional.shoppingMall.customer.shoppingMallArticleCategories.create(
      connection,
      { body: initialCategoryCreate },
    );
  typia.assert(initialCategory);

  const articleCreate = {
    shoppingMallArticleCategoryCode: initialCategory.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IShoppingMallArticle.ICreate;

  const article: IShoppingMallArticle =
    await api.functional.shoppingMall.customer.shoppingMallArticles.create(
      connection,
      { body: articleCreate },
    );
  typia.assert(article);

  // 3. Create a new article category to associate with the update
  const newCategoryCreate = {
    name: RandomGenerator.name(2),
    description: "Updated article category",
    parent_id: null,
  } satisfies IShoppingMallArticleCategory.ICreate;

  const newCategory: IShoppingMallArticleCategory =
    await api.functional.shoppingMall.customer.shoppingMallArticleCategories.create(
      connection,
      { body: newCategoryCreate },
    );
  typia.assert(newCategory);

  // 4. Perform update of the article changing title, body, and category
  const articleUpdate = {
    title: article.title + " Updated",
    body: article.body + " Additional content added to test update.",
    shoppingMallArticleCategoryId: newCategory.id,
  } satisfies IShoppingMallArticle.IUpdate;

  const updatedArticle: IShoppingMallArticle =
    await api.functional.shoppingMall.customer.shoppingMallArticles.update(
      connection,
      {
        shoppingMallArticleId: article.shoppingMallArticleId,
        body: articleUpdate,
      },
    );
  typia.assert(updatedArticle);

  // 5. Validate updated article values
  TestValidator.equals(
    "article id unchanged",
    updatedArticle.shoppingMallArticleId,
    article.shoppingMallArticleId,
  );

  TestValidator.equals(
    "article title updated",
    updatedArticle.title,
    articleUpdate.title!,
  );
  TestValidator.equals(
    "article body updated",
    updatedArticle.body,
    articleUpdate.body!,
  );
  TestValidator.equals(
    "article category updated",
    updatedArticle.shoppingMallArticleCategory.id,
    newCategory.id,
  );

  // Author must still be same customer
  TestValidator.equals(
    "article author unchanged",
    updatedArticle.shoppingMallCustomer.id,
    customer.id,
  );

  // CreatedAt must be unchanged
  TestValidator.equals(
    "article createdAt unchanged",
    updatedArticle.createdAt,
    article.createdAt,
  );

  // UpdatedAt must be different or equal to later timestamp,
  // but here assert that it is not the same as createdAt (updated)
  TestValidator.predicate(
    "article updatedAt changed",
    updatedArticle.updatedAt !== updatedArticle.createdAt,
  );
}
