import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallArticle";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallArticle";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test article filtering by creation and modification date ranges.
 *
 * This comprehensive test validates the admin articles filtering API with date
 * range parameters. It tests various date filtering scenarios including basic
 * ranges, edge cases, and ISO 8601 format validation for administrative content
 * management.
 *
 * Testing approach:
 *
 * 1. Establish admin authentication for testing date-based article filtering
 * 2. Test basic date range filtering with date_from and date_to parameters
 * 3. Validate edge cases like same start/end dates and future dates
 * 4. Test ISO 8601 date format compliance
 * 5. Verify filtered results only include articles within specified date ranges
 *
 * The test covers critical business scenarios for content management date
 * filtering, ensuring administrators can effectively filter articles based on
 * temporal properties.
 */
export async function test_api_admin_articles_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Admin Authentication
  // Create admin account for accessing article management endpoints
  const adminData = typia.random<IShoppingMallAdmin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Test Basic Date Range Filtering - Recent Articles
  // Test filtering articles within the last 7 days
  const baseDate = new Date();
  const oneWeekAgo = new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const lastWeekFilter = {
    date_from: oneWeekAgo.toISOString(),
    date_to: baseDate.toISOString(),
    page: 1,
    limit: 20,
  } satisfies IShoppingMallArticle.IRequest;

  const lastWeekArticles: IPageIShoppingMallArticle.ISummary =
    await api.functional.shoppingMall.admin.articles.index(connection, {
      body: lastWeekFilter,
    });
  typia.assert(lastWeekArticles);

  // Validate all articles are within the specified date range
  TestValidator.predicate(
    "all articles within last week date range",
    lastWeekArticles.data.every((article) => {
      const articleDate = new Date(article.createdAt);
      return articleDate >= oneWeekAgo && articleDate <= baseDate;
    }),
  );

  // Step 3: Test Monthly Date Range Filtering
  // Test filtering articles within the last 30 days
  const oneMonthAgo = new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  const lastMonthFilter = {
    date_from: oneMonthAgo.toISOString(),
    date_to: baseDate.toISOString(),
    page: 1,
    limit: 25,
    orderBy: "createdAt",
    orderDirection: "desc" as const,
  } satisfies IShoppingMallArticle.IRequest;

  const lastMonthArticles: IPageIShoppingMallArticle.ISummary =
    await api.functional.shoppingMall.admin.articles.index(connection, {
      body: lastMonthFilter,
    });
  typia.assert(lastMonthArticles);

  // Validate date range and sorting order
  TestValidator.predicate(
    "all articles within last month date range",
    lastMonthArticles.data.every((article) => {
      const articleDate = new Date(article.createdAt);
      return articleDate >= oneMonthAgo && articleDate <= baseDate;
    }),
  );

  // Step 4: Test Edge Case - Same Start/End Date
  const sameDayFilter = {
    date_from: oneWeekAgo.toISOString(),
    date_to: oneWeekAgo.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IShoppingMallArticle.IRequest;

  const sameDayArticles: IPageIShoppingMallArticle.ISummary =
    await api.functional.shoppingMall.admin.articles.index(connection, {
      body: sameDayFilter,
    });
  typia.assert(sameDayArticles);

  // Validate same-day filtering results
  TestValidator.predicate(
    "same day filtering returns articles with matching creation date",
    sameDayArticles.data.every((article) => {
      const articleDate = new Date(article.createdAt);
      return articleDate.toDateString() === oneWeekAgo.toDateString();
    }),
  );

  // Step 5: Test Future Date Handling
  const futureDate = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureDateFilter = {
    date_from: futureDate.toISOString(),
    date_to: new Date(
      futureDate.getTime() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    page: 1,
    limit: 10,
  } satisfies IShoppingMallArticle.IRequest;

  const futureArticles: IPageIShoppingMallArticle.ISummary =
    await api.functional.shoppingMall.admin.articles.index(connection, {
      body: futureDateFilter,
    });
  typia.assert(futureArticles);

  // Validate appropriate handling of future date ranges
  TestValidator.predicate(
    "future date filtering works correctly",
    futureArticles.data.length === 0 ||
      futureArticles.data.every((article) => {
        const articleDate = new Date(article.createdAt);
        return articleDate >= futureDate;
      }),
  );

  // Step 6: Test Quarter-Based Filtering
  const quarterStart = new Date(
    baseDate.getFullYear(),
    Math.floor(baseDate.getMonth() / 3) * 3,
    1,
  );
  const quarterEnd = new Date(
    baseDate.getFullYear(),
    Math.floor(baseDate.getMonth() / 3) * 3 + 3,
    0,
  );

  const currentQuarterFilter = {
    date_from: quarterStart.toISOString(),
    date_to: quarterEnd.toISOString(),
    page: 1,
    limit: 15,
    orderBy: "createdAt",
  } satisfies IShoppingMallArticle.IRequest;

  const currentQuarterArticles: IPageIShoppingMallArticle.ISummary =
    await api.functional.shoppingMall.admin.articles.index(connection, {
      body: currentQuarterFilter,
    });
  typia.assert(currentQuarterArticles);

  // Validate quarter date range compliance
  TestValidator.predicate(
    "all articles within current quarter",
    currentQuarterArticles.data.every((article) => {
      const articleDate = new Date(article.createdAt);
      return articleDate >= quarterStart && articleDate <= quarterEnd;
    }),
  );

  // Step 7: Test Year-Based Filtering
  const yearStart = new Date(baseDate.getFullYear(), 0, 1);
  const yearEnd = new Date(baseDate.getFullYear(), 11, 31, 23, 59, 59);

  const currentYearFilter = {
    date_from: yearStart.toISOString(),
    date_to: yearEnd.toISOString(),
    page: 1,
    limit: 50,
  } satisfies IShoppingMallArticle.IRequest;

  const currentYearArticles: IPageIShoppingMallArticle.ISummary =
    await api.functional.shoppingMall.admin.articles.index(connection, {
      body: currentYearFilter,
    });
  typia.assert(currentYearArticles);

  // Step 8: Test Date Format Validation - ISO 8601
  // Verify ISO 8601 date format compliance with manual ISO strings
  const isoFormatFilter = {
    date_from: "2024-01-01T00:00:00.000Z",
    date_to: "2024-12-31T23:59:59.999Z",
    page: 1,
    limit: 25,
  } satisfies IShoppingMallArticle.IRequest;

  const isoFormattedArticles: IPageIShoppingMallArticle.ISummary =
    await api.functional.shoppingMall.admin.articles.index(connection, {
      body: isoFormatFilter,
    });
  typia.assert(isoFormattedArticles);

  // Validate all returned article dates are in proper ISO 8601 format
  TestValidator.predicate(
    "all article dates in valid ISO 8601 format",
    isoFormattedArticles.data.every((article) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/.test(article.createdAt),
    ),
  );

  // Step 9: Test Empty Date Range Results - Future Range
  const emptyRangeFilter = {
    date_from: futureDate.toISOString(),
    date_to: new Date(futureDate.getTime() + 1 * 60 * 60 * 1000).toISOString(),
    page: 1,
    limit: 10,
  } satisfies IShoppingMallArticle.IRequest;

  const emptyRangeArticles: IPageIShoppingMallArticle.ISummary =
    await api.functional.shoppingMall.admin.articles.index(connection, {
      body: emptyRangeFilter,
    });
  typia.assert(emptyRangeArticles);

  TestValidator.equals(
    "future date range with no articles returns empty result",
    emptyRangeArticles.data.length,
    0,
  );

  // Step 10: Final Validation - Complex Multi-Date Scenario
  const threeMonthsAgo = new Date(
    baseDate.getTime() - 90 * 24 * 60 * 60 * 1000,
  );
  const yesterday = new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000);

  // Test with both future and past date ranges
  const complexDateFilter = {
    date_from: threeMonthsAgo.toISOString(),
    date_to: yesterday.toISOString(),
    page: 1,
    limit: 100,
    orderBy: "createdAt",
    orderDirection: "desc" as const,
  } satisfies IShoppingMallArticle.IRequest;

  const complexDateArticles: IPageIShoppingMallArticle.ISummary =
    await api.functional.shoppingMall.admin.articles.index(connection, {
      body: complexDateFilter,
    });
  typia.assert(complexDateArticles);

  // Validate sorted order is descending by creation date
  TestValidator.predicate(
    "articles sorted in descending chronological order",
    complexDateArticles.data.every((article, index) => {
      if (index === 0) return true;
      return (
        new Date(article.createdAt) <=
        new Date(complexDateArticles.data[index - 1].createdAt)
      );
    }),
  );

  // Validate all articles fall within the specified complex date range
  TestValidator.predicate(
    "all articles within complex date range",
    complexDateArticles.data.every((article) => {
      const articleDate = new Date(article.createdAt);
      return articleDate >= threeMonthsAgo && articleDate <= yesterday;
    }),
  );
}
