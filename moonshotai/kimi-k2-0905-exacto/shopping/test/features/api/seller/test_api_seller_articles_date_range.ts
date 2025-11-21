import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticle";
import type { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_articles_date_range(
  connection: api.IConnection,
) {
  // Create seller account for authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      tax_id: RandomGenerator.alphaNumeric(9),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "LLC",
        "Corporation",
        "Partnership",
        "Sole Proprietorship",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Test date range filtering with various scenarios

  // Scenario 1: Filter articles from last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const today = new Date();

  const recentArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        date_from: thirtyDaysAgo.toISOString(),
        date_to: today.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(recentArticles);

  TestValidator.predicate(
    "recent articles pagination exists",
    recentArticles.pagination !== undefined,
  );
  TestValidator.predicate(
    "recent articles data array exists",
    Array.isArray(recentArticles.data),
  );

  // Scenario 2: Filter articles from specific date range (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const weeklyArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        date_from: sevenDaysAgo.toISOString(),
        date_to: today.toISOString(),
        page: 1,
        limit: 50,
        orderBy: "createdAt",
        orderDirection: "desc",
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(weeklyArticles);

  // Scenario 3: Test single day filtering
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yesterdayStart = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate(),
  );
  const yesterdayEnd = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate() + 1,
  );

  const dailyArticles = await api.functional.shoppingMall.seller.articles.index(
    connection,
    {
      body: {
        date_from: yesterdayStart.toISOString(),
        date_to: yesterdayEnd.toISOString(),
        page: 1,
        limit: 100,
      } satisfies IShoppingMallArticle.IRequest,
    },
  );
  typia.assert(dailyArticles);

  // Scenario 4: Test future date filtering (should return empty or limited results)
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const futureArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        date_from: futureDate.toISOString(),
        date_to: farFuture.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(futureArticles);

  TestValidator.predicate(
    "future articles should have pagination",
    futureArticles.pagination !== undefined,
  );

  // Scenario 5: Test with additional filters combined with date range
  const featuredRecentArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        date_from: sevenDaysAgo.toISOString(),
        date_to: today.toISOString(),
        featured: true,
        status: RandomGenerator.pick([
          "draft",
          "published",
          "archived",
        ] as const),
        page: 1,
        limit: 25,
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(featuredRecentArticles);

  // Scenario 6: Test pagination with date ranges
  const paginatedArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        date_from: thirtyDaysAgo.toISOString(),
        date_to: today.toISOString(),
        page: 2,
        limit: 10,
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(paginatedArticles);

  TestValidator.predicate(
    "paginated results have current page 2",
    paginatedArticles.pagination.current === 2,
  );
  TestValidator.predicate(
    "paginated results have limit 10",
    paginatedArticles.pagination.limit === 10,
  );

  // Scenario 7: Test boundary conditions with very old dates
  const veryOldDate = new Date("2020-01-01");
  const early2023 = new Date("2023-01-01");

  const historicalArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        date_from: veryOldDate.toISOString(),
        date_to: early2023.toISOString(),
        page: 1,
        limit: 5,
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(historicalArticles);

  // Scenario 8: Test with different ordering options
  const oldestFirstArticles =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        date_from: sevenDaysAgo.toISOString(),
        date_to: today.toISOString(),
        page: 1,
        limit: 15,
        orderBy: "createdAt",
        orderDirection: "asc",
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(oldestFirstArticles);

  // Validate that all returned articles fall within the specified date range
  if (recentArticles.data.length > 0) {
    const firstArticle = recentArticles.data[0];
    TestValidator.predicate(
      "article has valid creation date",
      firstArticle.createdAt !== undefined,
    );

    const createdDate = new Date(firstArticle.createdAt);
    TestValidator.predicate(
      "article created within date range",
      createdDate >= thirtyDaysAgo && createdDate <= today,
    );
  }

  // Validate article summary structure
  if (weeklyArticles.data.length > 0) {
    const article = weeklyArticles.data[0];
    TestValidator.predicate(
      "article has required fields",
      article.id !== undefined &&
        article.code !== undefined &&
        article.title !== undefined &&
        article.summary !== undefined &&
        article.status !== undefined &&
        article.createdAt !== undefined &&
        article.channel !== undefined &&
        article.section !== undefined &&
        article.channelCategory !== undefined,
    );
  }

  // Test combined date and search filtering
  const searchWithDateRange =
    await api.functional.shoppingMall.seller.articles.index(connection, {
      body: {
        date_from: sevenDaysAgo.toISOString(),
        date_to: today.toISOString(),
        search: RandomGenerator.name(),
        page: 1,
        limit: 30,
      } satisfies IShoppingMallArticle.IRequest,
    });
  typia.assert(searchWithDateRange);

  // Validate pagination consistency across different date ranges
  TestValidator.predicate(
    "all paginations have required fields",
    recentArticles.pagination.current >= 1 &&
      recentArticles.pagination.limit >= 1 &&
      recentArticles.pagination.records >= 0 &&
      recentArticles.pagination.pages >= 0,
  );
}
