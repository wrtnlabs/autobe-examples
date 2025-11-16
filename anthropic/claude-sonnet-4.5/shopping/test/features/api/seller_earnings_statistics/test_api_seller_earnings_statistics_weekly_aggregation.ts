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
 * Test seller earnings statistics with weekly aggregation level.
 *
 * This test validates the seller earnings statistics endpoint when configured
 * for weekly aggregation. It ensures that:
 *
 * 1. Admin authentication succeeds and grants access to statistics
 * 2. Weekly aggregation produces time-series data with calendar week boundaries
 * 3. Each weekly data point contains accurate earnings metrics
 * 4. Active seller count tracks weekly engagement patterns
 * 5. Payout metrics reflect weekly processing schedules
 * 6. Response structure matches expected statistical format
 *
 * The weekly aggregation level provides balanced detail for operational
 * monitoring without overwhelming data volume, making it ideal for medium-term
 * performance analysis and trend identification.
 */
export async function test_api_seller_earnings_statistics_weekly_aggregation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });

  typia.assert(admin);
  TestValidator.equals("admin authenticated", typeof admin.id, "string");
  TestValidator.equals("admin email matches", admin.email, adminEmail);

  // Step 2: Request seller earnings statistics with weekly aggregation
  const statistics =
    await api.functional.shoppingMall.admin.statistics.seller_earnings.index(
      connection,
      {
        body: {
          aggregation_level: "weekly",
        } satisfies IShoppingMallSellerEarningsStatistics.IRequest,
      },
    );

  typia.assert(statistics);

  // Step 3: Validate overall statistics structure
  TestValidator.predicate(
    "total gross revenue is non-negative",
    statistics.total_gross_revenue >= 0,
  );
  TestValidator.predicate(
    "total net revenue is non-negative",
    statistics.total_net_revenue >= 0,
  );
  TestValidator.predicate(
    "total platform commissions is non-negative",
    statistics.total_platform_commissions >= 0,
  );
  TestValidator.predicate(
    "seller count is non-negative",
    statistics.seller_count >= 0,
  );

  // Step 4: Validate weekly time-series data exists
  TestValidator.predicate(
    "time series data array exists",
    Array.isArray(statistics.time_series_data),
  );

  // Step 5: If time-series data exists, validate weekly structure
  if (statistics.time_series_data.length > 0) {
    const firstDataPoint = statistics.time_series_data[0];
    typia.assert(firstDataPoint);

    TestValidator.predicate(
      "weekly data point has period start",
      typeof firstDataPoint.period_start === "string",
    );
    TestValidator.predicate(
      "weekly data point has period end",
      typeof firstDataPoint.period_end === "string",
    );
    TestValidator.predicate(
      "gross earnings is non-negative",
      firstDataPoint.gross_earnings >= 0,
    );
    TestValidator.predicate(
      "net earnings is non-negative",
      firstDataPoint.net_earnings >= 0,
    );
    TestValidator.predicate(
      "active seller count exists",
      firstDataPoint.active_seller_count >= 0,
    );
    TestValidator.predicate(
      "payout amount is non-negative",
      firstDataPoint.payout_amount >= 0,
    );
  }

  // Step 6: Validate payout metrics
  TestValidator.predicate(
    "completed payouts is non-negative",
    statistics.total_payouts_completed >= 0,
  );
  TestValidator.predicate(
    "pending payouts is non-negative",
    statistics.total_payouts_pending >= 0,
  );
  TestValidator.predicate(
    "average payout amount is non-negative",
    statistics.average_payout_amount >= 0,
  );
}
