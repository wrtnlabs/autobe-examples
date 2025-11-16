import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_article_deletion_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer user to obtain authorization
  const customerInput = {
    email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@example.com`,
    password: "StrongPass123!",
    full_name: RandomGenerator.name(2),
    ip: null,
    href: "https://shoppingmall.example.com/signup",
    referrer: "https://shoppingmall.example.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerInput,
    });
  typia.assert(customer);

  // 2. Create a shopping mall article associated with the authenticated customer
  const articleInput = {
    shoppingMallArticleCategoryCode: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IShoppingMallArticle.ICreate;

  const article: IShoppingMallArticle =
    await api.functional.shoppingMall.customer.shoppingMallArticles.create(
      connection,
      {
        body: articleInput,
      },
    );
  typia.assert(article);

  // Verify the article owner matches the customer who created it
  TestValidator.equals(
    "Article owner ID matches customer ID",
    article.shoppingMallCustomer.id,
    customer.id,
  );

  // 3. Delete the article by the customer
  await api.functional.shoppingMall.customer.shoppingMallArticles.erase(
    connection,
    {
      shoppingMallArticleId: article.shoppingMallArticleId,
    },
  );
}
