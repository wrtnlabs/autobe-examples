import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";
import type { IShoppingMallArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleComment";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_article_comment_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer signs up to the shopping mall
  const customerCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "password123",
    full_name: RandomGenerator.name(),
    href: "https://www.example.com/signup",
    referrer: "https://www.example.com/landing",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 2. Create a new shopping mall article category for comment linkage
  const articleCategoryCreateBody = {
    name: "Category " + RandomGenerator.alphaNumeric(5),
    description: null,
    parent_id: null,
  } satisfies IShoppingMallArticleCategory.ICreate;

  const articleCategory: IShoppingMallArticleCategory =
    await api.functional.shoppingMall.customer.shoppingMallArticleCategories.create(
      connection,
      {
        body: articleCategoryCreateBody,
      },
    );
  typia.assert(articleCategory);

  // 3. Create a comment in the newly created article category
  const commentCreateBody = {
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 7,
    }),
    metadata: null,
  } satisfies IShoppingMallArticleComment.ICreate;

  const comment: IShoppingMallArticleComment =
    await api.functional.shoppingMall.customer.shoppingMallArticleCategories.comments.create(
      connection,
      {
        shoppingMallArticleCategoryId: articleCategory.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 4. Validate that the comment is properly linked to the category
  TestValidator.equals(
    "comment linked to article category",
    comment.shopping_mall_article_category_id,
    articleCategory.id,
  );
}
