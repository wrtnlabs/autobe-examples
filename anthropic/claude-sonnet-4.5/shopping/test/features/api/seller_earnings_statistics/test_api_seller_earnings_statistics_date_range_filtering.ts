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
 * Test seller earnings statistics with date range filtering.
 *
 * This test validates that the admin can request seller earnings analytics for
 * a specific time period using start_date and end_date parameters, and that the
 * system correctly filters transactions and payouts to only include data within
 * the specified temporal boundaries.
 *
 * Test flow:
 *
 * 1. Create and authenticate admin account
 * 2. Define a 30-day date range for filtering
 * 3. Request seller earnings statistics with date range filters
 * 4. Validate response structure and data integrity
 * 5. Verify time-series data respects date boundaries
 * 6. Ensure all data points fall within the specified range
 */
export async function test_api_seller_earnings_statistics_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Define date range for filtering (30-day period)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const startDate = thirtyDaysAgo.toISOString();
  const endDate = now.toISOString();

  // Step 3: Request seller earnings statistics with date range filters
  const statistics: IShoppingMallSellerEarningsStatistics =
    await api.functional.shoppingMall.admin.statistics.seller_earnings.index(
      connection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
          aggregation_level: "daily",
          include_top_sellers: false,
        } satisfies IShoppingMallSellerEarningsStatistics.IRequest,
      },
    );
  typia.assert(statistics);

  // Step 4: Verify time-series data respects date boundaries
  const startDateTime = new Date(startDate).getTime();
  const endDateTime = new Date(endDate).getTime();

  for (const dataPoint of statistics.time_series_data) {
    const periodStartTime = new Date(dataPoint.period_start).getTime();
    const periodEndTime = new Date(dataPoint.period_end).getTime();

    TestValidator.predicate(
      "time-series period_start is within date range",
      periodStartTime >= startDateTime && periodStartTime <= endDateTime,
    );

    TestValidator.predicate(
      "time-series period_end is within date range",
      periodEndTime >= startDateTime && periodEndTime <= endDateTime,
    );

    TestValidator.predicate(
      "period_start is before period_end",
      periodStartTime < periodEndTime,
    );
  }

  // Step 5: Validate temporal filtering enables period-specific analysis
  TestValidator.predicate(
    "date range filtering returns valid statistics",
    statistics.total_gross_revenue >= 0 &&
      statistics.total_net_revenue >= 0 &&
      statistics.total_platform_commissions >= 0,
  );
}
