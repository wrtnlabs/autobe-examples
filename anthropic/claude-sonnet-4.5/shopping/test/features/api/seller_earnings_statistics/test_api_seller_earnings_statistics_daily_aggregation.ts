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
 * Test seller earnings statistics with daily aggregation level.
 *
 * This test validates that administrators can retrieve comprehensive seller
 * earnings analytics with daily time-series breakdown to analyze day-to-day
 * earnings patterns. It ensures the response includes all required financial
 * metrics and properly structured daily data points.
 *
 * Workflow:
 *
 * 1. Authenticate as platform administrator
 * 2. Request seller earnings statistics with daily aggregation
 * 3. Validate comprehensive top-level metrics (revenue, commissions, payouts)
 * 4. Verify time-series data array contains daily breakdown
 * 5. Ensure each data point has all required temporal and financial properties
 */
export async function test_api_seller_earnings_statistics_daily_aggregation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to access seller earnings statistics
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
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

  // Step 2: Request seller earnings statistics with daily aggregation level
  const statisticsRequest = {
    aggregation_level: "daily" as const,
  } satisfies IShoppingMallSellerEarningsStatistics.IRequest;

  const statistics =
    await api.functional.shoppingMall.admin.statistics.seller_earnings.index(
      connection,
      {
        body: statisticsRequest,
      },
    );
  typia.assert(statistics);

  // Step 3: Validate comprehensive top-level financial metrics
  TestValidator.predicate(
    "total_gross_revenue is non-negative",
    statistics.total_gross_revenue >= 0,
  );
  TestValidator.predicate(
    "total_net_revenue is non-negative",
    statistics.total_net_revenue >= 0,
  );
  TestValidator.predicate(
    "total_platform_commissions is non-negative",
    statistics.total_platform_commissions >= 0,
  );
  TestValidator.predicate(
    "total_payouts_completed is non-negative",
    statistics.total_payouts_completed >= 0,
  );
  TestValidator.predicate(
    "total_payouts_pending is non-negative",
    statistics.total_payouts_pending >= 0,
  );
  TestValidator.predicate(
    "average_payout_amount is non-negative",
    statistics.average_payout_amount >= 0,
  );
  TestValidator.predicate(
    "payout_count_completed is non-negative",
    statistics.payout_count_completed >= 0,
  );
  TestValidator.predicate(
    "payout_count_pending is non-negative",
    statistics.payout_count_pending >= 0,
  );
  TestValidator.predicate(
    "average_commission_rate is between 0 and 100",
    statistics.average_commission_rate >= 0 &&
      statistics.average_commission_rate <= 100,
  );
  TestValidator.predicate(
    "seller_count is non-negative",
    statistics.seller_count >= 0,
  );

  // Step 4: Verify time-series data array is present
  TestValidator.predicate(
    "time_series_data array exists",
    Array.isArray(statistics.time_series_data),
  );

  // Step 5: Validate each time-series data point structure
  for (const dataPoint of statistics.time_series_data) {
    typia.assert<IShoppingMallSellerEarningsTimeSeriesDataPoint>(dataPoint);

    TestValidator.predicate(
      "period_start is valid date-time",
      typeof dataPoint.period_start === "string" &&
        dataPoint.period_start.length > 0,
    );
    TestValidator.predicate(
      "period_end is valid date-time",
      typeof dataPoint.period_end === "string" &&
        dataPoint.period_end.length > 0,
    );
    TestValidator.predicate(
      "gross_earnings is non-negative",
      dataPoint.gross_earnings >= 0,
    );
    TestValidator.predicate(
      "net_earnings is non-negative",
      dataPoint.net_earnings >= 0,
    );
    TestValidator.predicate(
      "platform_commission is non-negative",
      dataPoint.platform_commission >= 0,
    );
    TestValidator.predicate(
      "payout_amount is non-negative",
      dataPoint.payout_amount >= 0,
    );
    TestValidator.predicate(
      "transaction_count is non-negative",
      dataPoint.transaction_count >= 0,
    );
    TestValidator.predicate(
      "active_seller_count is non-negative",
      dataPoint.active_seller_count >= 0,
    );
  }
}
