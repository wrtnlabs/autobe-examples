import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerFeeAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerFeeAnalytics";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerFeeAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerFeeAnalytics";
import type { IShoppingMallSellerFeeAnalyticsDailyTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerFeeAnalyticsDailyTrend";
import type { IShoppingMallSellerFeeAnalyticsFeeTypeBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerFeeAnalyticsFeeTypeBreakdown";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate basic seller fee analytics for a recent time range.
 *
 * Business context:
 *
 * - A seller, once registered and authenticated, should be able to query
 *   fee/commission analytics over a recent time window using
 *   /shoppingMall/seller/analytics/sellerFees.
 * - The response must conform to the paging contract and summarize fees per
 *   seller, per currency, with fee-type and daily-trend breakdowns.
 * - When no fee records match the requested window, the API should still return a
 *   structurally valid empty page.
 *
 * Steps:
 *
 * 1. Register a new seller via /auth/seller/join to obtain an authenticated seller
 *    context. The SDK will configure Authorization header automatically on the
 *    shared connection.
 * 2. Call PATCH /shoppingMall/seller/analytics/sellerFees for a recent 7‑day
 *    window with a default grouping ("day") and common paging/sort options.
 * 3. Validate pagination structure and summary rows when results exist:
 *
 *    - Pagination.current and .limit match requested page/pageSize
 *    - Records and pages are non-negative and consistent with data length
 *    - Each row belongs to the authenticated seller and shares a common currency.
 *    - Basic temporal ordering (period_start <= period_end) holds.
 *    - Fee_type_breakdowns and daily_trends, when present, are internally consistent
 *         and numeric totals are finite; the sum of per-fee-type
 *         total_fee_amount is close to the row total_fee_amount.
 * 4. Issue a second analytics query for a far‑past window that is very unlikely to
 *    contain data and, when it returns an empty data array, verify that
 *    pagination.records is 0, data is empty, and pages is either 0 or 1
 *    depending on implementation policy.
 */
export async function test_api_seller_fee_analytics_basic_time_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller (authentication handled by SDK: sets Authorization header)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.test.join",
    referrer: "https://referrer.test",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Prepare recent 7-day window and request analytics
  const now = new Date();
  const sevenDaysMillis = 7 * 24 * 60 * 60 * 1000;
  const startRecent = new Date(now.getTime() - sevenDaysMillis).toISOString();
  const endRecent = now.toISOString();

  const recentRequestBody = {
    startDate: startRecent,
    endDate: endRecent,
    groupBy: "day",
    page: 1,
    pageSize: 20,
    sortBy: "totalAmount",
    sortDirection: "desc",
  } satisfies IShoppingMallSellerFeeAnalytics.IRequest;

  const recentPage: IPageIShoppingMallSellerFeeAnalytics.ISummary =
    await api.functional.shoppingMall.seller.analytics.sellerFees.index(
      connection,
      {
        body: recentRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerFeeAnalytics.ISummary>(recentPage);

  const pagination = recentPage.pagination;
  TestValidator.equals(
    "pagination.current matches requested page",
    pagination.current,
    recentRequestBody.page,
  );
  TestValidator.equals(
    "pagination.limit matches requested pageSize",
    pagination.limit,
    recentRequestBody.pageSize,
  );
  TestValidator.predicate(
    "pagination.records is at least number of data rows",
    pagination.records >= recentPage.data.length,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );

  if (recentPage.data.length > 0) {
    // All rows should relate to the joined seller
    const sellerId = seller.id;

    // Ensure currency consistency across rows
    const currencies = recentPage.data.map((row) => row.currency);
    const firstCurrency = currencies[0];

    TestValidator.predicate(
      "all summary rows have same currency",
      currencies.every((c) => c === firstCurrency),
    );

    for (const row of recentPage.data) {
      // seller.id should match authenticated seller
      TestValidator.equals(
        "summary.seller.id matches authenticated seller",
        row.seller.id,
        sellerId,
      );

      // period_start and period_end basic ordering check
      const periodStart = new Date(row.period_start).getTime();
      const periodEnd = new Date(row.period_end).getTime();
      TestValidator.predicate(
        "period_start precedes or equals period_end",
        periodStart <= periodEnd,
      );

      // Totals are finite numbers (typia.assert already guarantees numeric)
      TestValidator.predicate(
        "total_fee_amount is finite",
        Number.isFinite(row.total_fee_amount),
      );
      TestValidator.predicate(
        "total_tax_amount is finite",
        Number.isFinite(row.total_tax_amount),
      );
      TestValidator.predicate(
        "total_platform_revenue_amount is finite",
        Number.isFinite(row.total_platform_revenue_amount),
      );
      TestValidator.predicate(
        "total_non_revenue_pass_through_amount is finite",
        Number.isFinite(row.total_non_revenue_pass_through_amount),
      );

      // fee_type_breakdowns consistency: non-empty fee_type and approximate sum
      if (row.fee_type_breakdowns.length > 0) {
        const breakdowns: IShoppingMallSellerFeeAnalyticsFeeTypeBreakdown.ISummary[] =
          row.fee_type_breakdowns;

        for (const b of breakdowns) {
          TestValidator.predicate(
            "breakdown.fee_type is non-empty",
            b.fee_type.length > 0,
          );
          TestValidator.predicate(
            "breakdown.total_fee_amount is finite",
            Number.isFinite(b.total_fee_amount),
          );
          TestValidator.predicate(
            "breakdown.total_tax_amount is finite",
            Number.isFinite(b.total_tax_amount),
          );
          TestValidator.predicate(
            "breakdown.platform_revenue_amount is finite",
            Number.isFinite(b.platform_revenue_amount),
          );
          TestValidator.predicate(
            "breakdown.non_revenue_pass_through_amount is finite",
            Number.isFinite(b.non_revenue_pass_through_amount),
          );
        }

        const sumBreakdownFee = breakdowns.reduce(
          (acc, b) => acc + b.total_fee_amount,
          0,
        );
        const epsilon = Math.abs(row.total_fee_amount) * 0.05 + 1e-6;
        TestValidator.predicate(
          "sum of breakdown total_fee_amount roughly matches total_fee_amount",
          Math.abs(sumBreakdownFee - row.total_fee_amount) <= epsilon,
        );
      }

      // daily_trends consistency: dates and finite numbers
      const trends: IShoppingMallSellerFeeAnalyticsDailyTrend.ISummary[] =
        row.daily_trends;
      for (const t of trends) {
        const trendDate = new Date(t.business_date).getTime();
        TestValidator.predicate(
          "trend date is within row period bounds (inclusive)",
          trendDate >= periodStart && trendDate <= periodEnd,
        );
        TestValidator.predicate(
          "trend.total_fee_amount is finite",
          Number.isFinite(t.total_fee_amount),
        );
        TestValidator.predicate(
          "trend.total_tax_amount is finite",
          Number.isFinite(t.total_tax_amount),
        );
        TestValidator.predicate(
          "trend.platform_revenue_amount is finite",
          Number.isFinite(t.platform_revenue_amount),
        );
        TestValidator.predicate(
          "trend.non_revenue_pass_through_amount is finite",
          Number.isFinite(t.non_revenue_pass_through_amount),
        );
      }
    }
  }

  // 3. Far-past window likely having no data
  const tenYearsMillis = 10 * 365 * 24 * 60 * 60 * 1000;
  const pastEnd = new Date(now.getTime() - tenYearsMillis).toISOString();
  const pastStart = new Date(now.getTime() - tenYearsMillis * 2).toISOString();

  const pastRequestBody = {
    startDate: pastStart,
    endDate: pastEnd,
    groupBy: "day",
    page: 1,
    pageSize: 20,
    sortBy: "totalAmount",
    sortDirection: "desc",
  } satisfies IShoppingMallSellerFeeAnalytics.IRequest;

  const pastPage: IPageIShoppingMallSellerFeeAnalytics.ISummary =
    await api.functional.shoppingMall.seller.analytics.sellerFees.index(
      connection,
      {
        body: pastRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallSellerFeeAnalytics.ISummary>(pastPage);

  if (pastPage.data.length === 0) {
    TestValidator.equals(
      "when no records, records count should be 0",
      pastPage.pagination.records,
      0,
    );
    TestValidator.equals(
      "when no records, data array is empty",
      pastPage.data.length,
      0,
    );
    TestValidator.predicate(
      "pages is 0 or 1 when no records",
      pastPage.pagination.pages === 0 || pastPage.pagination.pages === 1,
    );
  }
}
