import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_article_creation_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Customer registration (joining the platform)
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "http://localhost/signup",
    referrer: "http://localhost/landing",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(authorizedCustomer);

  // Step 2: Create Shopping Mall Article
  const articleCreateBody = {
    shoppingMallArticleCategoryCode: "default",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 8, wordMax: 12 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 9,
    }),
  } satisfies IShoppingMallArticle.ICreate;

  const article: IShoppingMallArticle =
    await api.functional.shoppingMall.customer.shoppingMallArticles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // Step 3: Validate returned article
  TestValidator.predicate(
    "shoppingMallArticleId is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      article.shoppingMallArticleId,
    ),
  );
  TestValidator.equals(
    "article title matches",
    article.title,
    articleCreateBody.title,
  );
  TestValidator.equals(
    "article body matches",
    article.body,
    articleCreateBody.body,
  );

  TestValidator.predicate(
    "createdAt is ISO 8601 formatted string",
    typeof article.createdAt === "string" && article.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is ISO 8601 formatted string",
    typeof article.updatedAt === "string" && article.updatedAt.length > 0,
  );

  // Validate category is provided and has required properties
  typia.assert(article.shoppingMallArticleCategory);
  TestValidator.predicate(
    "article category id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      article.shoppingMallArticleCategory.id,
    ),
  );
  TestValidator.predicate(
    "article category has a name",
    typeof article.shoppingMallArticleCategory.name === "string" &&
      article.shoppingMallArticleCategory.name.length > 0,
  );

  // Validate customer summary is provided and has required properties
  typia.assert(article.shoppingMallCustomer);
  TestValidator.equals(
    "author id matches authorized customer",
    article.shoppingMallCustomer.id,
    authorizedCustomer.id,
  );
  TestValidator.equals(
    "author email matches authorized customer",
    article.shoppingMallCustomer.email,
    authorizedCustomer.email,
  );
  TestValidator.equals(
    "author name matches authorized customer",
    article.shoppingMallCustomer.name,
    authorizedCustomer.name,
  );

  TestValidator.predicate(
    "commentsCount is zero or positive integer",
    Number.isInteger(article.commentsCount) && article.commentsCount >= 0,
  );
  TestValidator.predicate(
    "likesCount is zero or positive integer",
    Number.isInteger(article.likesCount) && article.likesCount >= 0,
  );
}
