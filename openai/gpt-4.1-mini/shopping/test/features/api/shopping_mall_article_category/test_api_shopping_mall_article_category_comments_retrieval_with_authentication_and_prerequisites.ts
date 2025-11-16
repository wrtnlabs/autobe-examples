import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticleComment";
import type { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import type { IShoppingMallArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleCategory";
import type { IShoppingMallArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticleComment";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUser";

export async function test_api_shopping_mall_article_category_comments_retrieval_with_authentication_and_prerequisites(
  connection: api.IConnection,
) {
  // 1. Customer join - user registration and authentication
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "1234",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Create article category
  const categoryCreateBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_id: null,
  } satisfies IShoppingMallArticleCategory.ICreate;
  const category: IShoppingMallArticleCategory =
    await api.functional.shoppingMall.customer.shoppingMallArticleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3. Create article associated with category
  const articleCreateBody = {
    shoppingMallArticleCategoryCode: category.id,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 4,
      sentenceMax: 10,
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

  // 4. Retrieve article category comments
  const commentRequestBody = {
    page: 1,
    limit: 10,
    search: undefined,
    sortBy: undefined,
    sortOrder: undefined,
    articleId: article.shoppingMallArticleId,
    authorId: customer.id,
    dateFrom: undefined,
    dateTo: undefined,
  } satisfies IShoppingMallArticleComment.IRequest;

  const commentsPage: IPageIShoppingMallArticleComment.ISummary =
    await api.functional.shoppingMall.shoppingMallArticleCategories.comments.index(
      connection,
      {
        shoppingMallArticleCategoryId: category.id,
        body: commentRequestBody,
      },
    );
  typia.assert(commentsPage);

  // Validate basic pagination info
  TestValidator.predicate(
    "comment page current is 1",
    commentsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "comment page limit is 10",
    commentsPage.pagination.limit === 10,
  );
}
