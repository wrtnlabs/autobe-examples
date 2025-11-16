import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerEarningsStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarningsStatistics";
import type { IShoppingMallSellerEarningsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarningsSummary";
import type { IShoppingMallSellerEarningsTimeSeriesDataPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarningsTimeSeriesDataPoint";

/**
 * Test seller earnings statistics with yearly aggregation for annual
 * performance review.
 *
 * This test validates the admin's ability to retrieve comprehensive seller
 * earnings statistics aggregated by year. It ensures that yearly aggregation
 * produces annual metrics with time-series data points representing full
 * calendar years, accurately calculating payout velocity metrics and commission
 * rates at annual granularity.
 *
 * The test supports strategic planning, seller performance reviews, and
 * multi-year trend identification by providing long-term financial analytics.
 *
 * Steps:
 *
 * 1. Admin authenticates via join endpoint
 * 2. Admin requests seller earnings statistics with yearly aggregation
 * 3. Validate response contains comprehensive annual metrics
 * 4. Verify time-series data points represent full calendar years
 * 5. Confirm payout velocity and commission rate calculations are accurate
 */
export async function test_api_seller_earnings_statistics_yearly_aggregation(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates via join endpoint
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Admin requests seller earnings statistics with yearly aggregation
  const now = new Date();
  const threeYearsAgo = new Date(now.getFullYear() - 3, 0, 1);

  const requestBody = {
    start_date: threeYearsAgo.toISOString(),
    end_date: now.toISOString(),
    aggregation_level: "yearly" as const,
    include_top_sellers: true,
    top_sellers_limit: 10,
  } satisfies IShoppingMallSellerEarningsStatistics.IRequest;

  const statistics =
    await api.functional.shoppingMall.admin.statistics.seller_earnings.index(
      connection,
      {
        body: requestBody,
      },
    );

  // Step 3: Validate response contains comprehensive annual metrics
  typia.assert(statistics);

  TestValidator.predicate(
    "total gross revenue is non-negative",
    statistics.total_gross_revenue >= 0,
  );

  TestValidator.predicate(
    "total net revenue is non-negative",
    statistics.total_net_revenue >= 0,
  );

  TestValidator.predicate(
    "net revenue is less than or equal to gross revenue",
    statistics.total_net_revenue <= statistics.total_gross_revenue,
  );

  TestValidator.predicate(
    "platform commissions are non-negative",
    statistics.total_platform_commissions >= 0,
  );

  TestValidator.predicate(
    "completed payouts are non-negative",
    statistics.total_payouts_completed >= 0,
  );

  TestValidator.predicate(
    "pending payouts are non-negative",
    statistics.total_payouts_pending >= 0,
  );

  TestValidator.predicate(
    "average payout amount is non-negative",
    statistics.average_payout_amount >= 0,
  );

  TestValidator.predicate(
    "completed payout count is non-negative",
    statistics.payout_count_completed >= 0,
  );

  TestValidator.predicate(
    "pending payout count is non-negative",
    statistics.payout_count_pending >= 0,
  );

  TestValidator.predicate(
    "average commission rate is between 0 and 100",
    statistics.average_commission_rate >= 0 &&
      statistics.average_commission_rate <= 100,
  );

  TestValidator.predicate(
    "seller count is non-negative",
    statistics.seller_count >= 0,
  );

  // Step 4: Verify time-series data points represent full calendar years
  TestValidator.predicate(
    "time series data exists",
    Array.isArray(statistics.time_series_data),
  );

  for (const dataPoint of statistics.time_series_data) {
    typia.assert(dataPoint);

    TestValidator.predicate(
      "gross earnings are non-negative",
      dataPoint.gross_earnings >= 0,
    );

    TestValidator.predicate(
      "net earnings are non-negative",
      dataPoint.net_earnings >= 0,
    );

    TestValidator.predicate(
      "net earnings less than or equal to gross earnings",
      dataPoint.net_earnings <= dataPoint.gross_earnings,
    );

    TestValidator.predicate(
      "platform commission is non-negative",
      dataPoint.platform_commission >= 0,
    );

    TestValidator.predicate(
      "payout amount is non-negative",
      dataPoint.payout_amount >= 0,
    );

    TestValidator.predicate(
      "transaction count is non-negative",
      dataPoint.transaction_count >= 0,
    );

    TestValidator.predicate(
      "active seller count is non-negative",
      dataPoint.active_seller_count >= 0,
    );

    // Verify yearly granularity - period should span approximately one year
    const periodStart = new Date(dataPoint.period_start);
    const periodEnd = new Date(dataPoint.period_end);
    const millisInYear = 365 * 24 * 60 * 60 * 1000;
    const periodDuration = periodEnd.getTime() - periodStart.getTime();

    TestValidator.predicate(
      "period start is before period end",
      periodStart < periodEnd,
    );

    TestValidator.predicate(
      "period duration is approximately one year",
      periodDuration >= millisInYear * 0.99 &&
        periodDuration <= millisInYear * 1.02,
    );
  }

  // Step 5: Verify top sellers data if included
  if (statistics.top_earning_sellers) {
    TestValidator.predicate(
      "top sellers is an array",
      Array.isArray(statistics.top_earning_sellers),
    );

    TestValidator.predicate(
      "top sellers count does not exceed limit",
      statistics.top_earning_sellers.length <= 10,
    );

    for (const seller of statistics.top_earning_sellers) {
      typia.assert(seller);

      TestValidator.predicate(
        "seller gross revenue is non-negative",
        seller.gross_revenue >= 0,
      );

      TestValidator.predicate(
        "seller net revenue is non-negative",
        seller.net_revenue >= 0,
      );

      TestValidator.predicate(
        "seller platform commissions are non-negative",
        seller.platform_commissions >= 0,
      );

      TestValidator.predicate(
        "seller transaction count is non-negative",
        seller.transaction_count >= 0,
      );

      TestValidator.predicate(
        "seller average transaction value is non-negative",
        seller.average_transaction_value >= 0,
      );
    }
  }
}
