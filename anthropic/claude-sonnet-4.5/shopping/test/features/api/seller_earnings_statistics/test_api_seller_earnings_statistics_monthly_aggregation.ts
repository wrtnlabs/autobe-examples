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
 * Test seller earnings statistics with monthly aggregation for long-term trend
 * analysis.
 *
 * This test validates the seller earnings statistics API with monthly
 * time-series aggregation. An admin authenticates and requests earnings data
 * aggregated by calendar month over multiple months to analyze long-term
 * financial trends.
 *
 * Test workflow:
 *
 * 1. Admin joins/registers to obtain authentication credentials
 * 2. Admin requests seller earnings statistics with monthly aggregation level
 * 3. Validates that monthly aggregation produces correct time-series data points
 * 4. Verifies calculations for gross revenue, net revenue, platform commissions
 * 5. Checks payout metrics including completed amounts, pending amounts, and
 *    counts
 * 6. Ensures average payout amounts and commission rates are correctly calculated
 * 7. Confirms the aggregation_level parameter controls time-series granularity
 * 8. Validates time-series data points are properly grouped by calendar month
 */
export async function test_api_seller_earnings_statistics_monthly_aggregation(
  connection: api.IConnection,
) {
  // Step 1: Admin joins/registers to obtain authentication credentials
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreateData,
  });
  typia.assert(admin);

  // Step 2: Admin requests seller earnings statistics with monthly aggregation
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);

  const topSellersLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;

  const requestBody = {
    start_date: threeMonthsAgo.toISOString(),
    end_date: now.toISOString(),
    aggregation_level: "monthly",
    include_top_sellers: true,
    top_sellers_limit: topSellersLimit,
  } satisfies IShoppingMallSellerEarningsStatistics.IRequest;

  const statistics =
    await api.functional.shoppingMall.admin.statistics.seller_earnings.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(statistics);

  // Step 3: Validate that monthly aggregation produces time-series data points
  TestValidator.predicate(
    "time_series_data should exist and be an array",
    Array.isArray(statistics.time_series_data),
  );

  // Step 4: Verify calculations for gross revenue, net revenue, platform commissions
  TestValidator.predicate(
    "total_gross_revenue should be non-negative",
    statistics.total_gross_revenue >= 0,
  );

  TestValidator.predicate(
    "total_net_revenue should be non-negative",
    statistics.total_net_revenue >= 0,
  );

  TestValidator.predicate(
    "total_platform_commissions should be non-negative",
    statistics.total_platform_commissions >= 0,
  );

  TestValidator.predicate(
    "net revenue should equal gross revenue minus commissions",
    Math.abs(
      statistics.total_net_revenue -
        (statistics.total_gross_revenue -
          statistics.total_platform_commissions),
    ) < 0.01,
  );

  // Step 5: Check payout metrics
  TestValidator.predicate(
    "total_payouts_completed should be non-negative",
    statistics.total_payouts_completed >= 0,
  );

  TestValidator.predicate(
    "total_payouts_pending should be non-negative",
    statistics.total_payouts_pending >= 0,
  );

  TestValidator.predicate(
    "payout_count_completed should be non-negative",
    statistics.payout_count_completed >= 0,
  );

  TestValidator.predicate(
    "payout_count_pending should be non-negative",
    statistics.payout_count_pending >= 0,
  );

  // Step 6: Validate average calculations
  TestValidator.predicate(
    "average_payout_amount should be non-negative",
    statistics.average_payout_amount >= 0,
  );

  TestValidator.predicate(
    "average_commission_rate should be between 0 and 100",
    statistics.average_commission_rate >= 0 &&
      statistics.average_commission_rate <= 100,
  );

  TestValidator.predicate(
    "seller_count should be non-negative",
    statistics.seller_count >= 0,
  );

  // Step 7: Validate time-series data points are grouped by calendar month
  if (statistics.time_series_data.length > 0) {
    for (const dataPoint of statistics.time_series_data) {
      typia.assert(dataPoint);

      TestValidator.predicate(
        "gross_earnings should be non-negative",
        dataPoint.gross_earnings >= 0,
      );

      TestValidator.predicate(
        "net_earnings should be non-negative",
        dataPoint.net_earnings >= 0,
      );

      TestValidator.predicate(
        "platform_commission should be non-negative",
        dataPoint.platform_commission >= 0,
      );

      TestValidator.predicate(
        "payout_amount should be non-negative",
        dataPoint.payout_amount >= 0,
      );

      TestValidator.predicate(
        "transaction_count should be non-negative",
        dataPoint.transaction_count >= 0,
      );

      TestValidator.predicate(
        "active_seller_count should be non-negative",
        dataPoint.active_seller_count >= 0,
      );

      // Validate period_start comes before period_end
      const periodStart = new Date(dataPoint.period_start);
      const periodEnd = new Date(dataPoint.period_end);
      TestValidator.predicate(
        "period_start should be before period_end",
        periodStart < periodEnd,
      );

      // Validate monthly aggregation: period should span approximately one month
      const daysDifference =
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
      TestValidator.predicate(
        "monthly period should span approximately 28-31 days",
        daysDifference >= 28 && daysDifference <= 31,
      );
    }
  }

  // Step 8: Validate top earning sellers if included
  if (
    statistics.top_earning_sellers &&
    statistics.top_earning_sellers.length > 0
  ) {
    for (const seller of statistics.top_earning_sellers) {
      typia.assert(seller);

      TestValidator.predicate(
        "seller gross_revenue should be non-negative",
        seller.gross_revenue >= 0,
      );

      TestValidator.predicate(
        "seller net_revenue should be non-negative",
        seller.net_revenue >= 0,
      );

      TestValidator.predicate(
        "seller platform_commissions should be non-negative",
        seller.platform_commissions >= 0,
      );

      TestValidator.predicate(
        "seller transaction_count should be non-negative",
        seller.transaction_count >= 0,
      );

      TestValidator.predicate(
        "seller average_transaction_value should be non-negative",
        seller.average_transaction_value >= 0,
      );
    }
  }
}
