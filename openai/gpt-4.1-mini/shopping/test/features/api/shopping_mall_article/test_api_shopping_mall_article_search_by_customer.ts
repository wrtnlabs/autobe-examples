import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticle";
import type { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test the complete workflow for a customer to search and retrieve published
 * shopping mall articles.
 *
 * This scenario involves authenticating as a new customer user by registering
 * via join, creating an article category for classification, creating an
 * article authored by the customer, and then performing paginated search
 * queries with filters such as title, author, and category.
 *
 * The test validates proper authorization, successful creation of dependent
 * resources, correct search functionality with pagination, and that search
 * results contain the expected article data.
 */
export async function test_api_shopping_mall_article_search_by_customer(
  connection: api.IConnection,
) {
  // 1. Register new customer user using join API
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securepassword123",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerBody });
  typia.assert(customer);

  // 2. Create new shopping mall article category
  const categoryBody = {
    name: RandomGenerator.name(2),
    description: "Category for automated test articles",
    parent_id: null,
  } satisfies IShoppingMallArticleCategory.ICreate;
  const category: IShoppingMallArticleCategory =
    await api.functional.shoppingMall.customer.shoppingMallArticleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 3. Create new article authored by this customer
  const articleBody = {
    shoppingMallArticleCategoryCode: category.id,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 6, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IShoppingMallArticle.ICreate;
  const article: IShoppingMallArticle =
    await api.functional.shoppingMall.customer.shoppingMallArticles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  // Validate created article references the created category and customer correctly
  TestValidator.equals(
    "article category id matches",
    article.shoppingMallArticleCategory.id,
    category.id,
  );
  TestValidator.equals(
    "article customer id matches",
    article.shoppingMallCustomer.id,
    customer.id,
  );

  // 4. Perform paginated search with title filter to find our article
  const requestBodyPage1 = {
    page: 1,
    limit: 5,
    search: article.title.substring(0, 5), // partial search for title
    author_id: customer.id,
    category_id: category.id,
    created_after: null,
    created_before: null,
    sort_by: "created_at",
    order: "desc",
  } satisfies IShoppingMallArticle.IRequest;

  const page1: IPageIShoppingMallArticle.ISummary =
    await api.functional.shoppingMall.customer.shoppingMallArticles.index(
      connection,
      {
        body: requestBodyPage1,
      },
    );
  typia.assert(page1);

  TestValidator.predicate(
    "page1 has articles",
    page1.pagination.records > 0 && page1.data.length > 0,
  );

  // Validate each article in the results belongs to the customer and category
  for (const articleSummary of page1.data) {
    TestValidator.equals(
      "article belongs to correct customer",
      articleSummary.shopping_mall_customer.id,
      customer.id,
    );
    TestValidator.equals(
      "article belongs to correct category",
      articleSummary.shopping_mall_article_category.id,
      category.id,
    );
  }

  // If more pages, validate pagination consistency
  if (page1.pagination.pages > 1) {
    const requestBodyPage2 = {
      ...requestBodyPage1,
      page: 2,
    } satisfies IShoppingMallArticle.IRequest;

    const page2: IPageIShoppingMallArticle.ISummary =
      await api.functional.shoppingMall.customer.shoppingMallArticles.index(
        connection,
        { body: requestBodyPage2 },
      );
    typia.assert(page2);

    // Validate page2 data is different from page1
    TestValidator.notEquals(
      "page2 data is different from page1",
      page1.data,
      page2.data,
    );
  }
}
