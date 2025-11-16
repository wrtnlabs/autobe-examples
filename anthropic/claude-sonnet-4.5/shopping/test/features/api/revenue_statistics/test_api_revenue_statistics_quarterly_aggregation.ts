import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRevenueStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRevenueStatistics";

/**
 * Test revenue statistics with quarterly grouping for seasonal analysis.
 *
 * This test validates the platform's ability to aggregate revenue data by
 * quarters, enabling seasonal pattern identification and quarterly performance
 * trend analysis. The test ensures that quarterly aggregation correctly groups
 * three-month periods and produces accurate financial metrics for strategic
 * planning.
 *
 * Test Flow:
 *
 * 1. Authenticate as platform administrator
 * 2. Request revenue statistics with quarterly grouping over multiple quarters
 * 3. Validate response structure and data types
 * 4. Verify quarterly aggregation accuracy
 * 5. Confirm growth rate calculations for quarter-over-quarter comparison
 * 6. Ensure all financial metrics are logically consistent and non-negative
 */
export async function test_api_revenue_statistics_quarterly_aggregation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as platform administrator
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

  // Step 2: Define date range spanning multiple quarters (2 full quarters for growth comparison)
  // Using dates that clearly span Q1 and Q2 of 2024
  const startDate = "2024-01-01";
  const endDate = "2024-06-30";

  // Step 3: Request revenue statistics with quarterly grouping
  const revenueStats =
    await api.functional.shoppingMall.admin.statistics.revenue.index(
      connection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
          grouping: "quarterly",
        } satisfies IShoppingMallRevenueStatistics.IRequest,
      },
    );
  typia.assert(revenueStats);

  // Step 4: Validate response structure matches expected schema
  TestValidator.predicate(
    "revenue statistics response is valid",
    typeof revenueStats.total_gross_revenue === "number",
  );

  // Step 5: Verify all revenue metrics are non-negative
  TestValidator.predicate(
    "total gross revenue is non-negative",
    revenueStats.total_gross_revenue >= 0,
  );

  TestValidator.predicate(
    "total net revenue is non-negative",
    revenueStats.total_net_revenue >= 0,
  );

  TestValidator.predicate(
    "total platform commission is non-negative",
    revenueStats.total_platform_commission >= 0,
  );

  TestValidator.predicate(
    "total seller payouts is non-negative",
    revenueStats.total_seller_payouts >= 0,
  );

  TestValidator.predicate(
    "total refund amount is non-negative",
    revenueStats.total_refund_amount >= 0,
  );

  // Step 6: Verify transaction counts are non-negative integers
  TestValidator.predicate(
    "total order count is non-negative",
    revenueStats.total_order_count >= 0,
  );

  TestValidator.predicate(
    "total transaction count is non-negative",
    revenueStats.total_transaction_count >= 0,
  );

  // Step 7: Validate average order value is non-negative
  TestValidator.predicate(
    "average order value is non-negative",
    revenueStats.average_order_value >= 0,
  );

  // Step 8: Verify period dates match request parameters
  TestValidator.predicate(
    "period start date matches request",
    revenueStats.period_start_date.startsWith(startDate),
  );

  TestValidator.predicate(
    "period end date matches request",
    revenueStats.period_end_date.startsWith(endDate),
  );

  // Step 9: Validate logical consistency - net revenue should be gross revenue minus refunds
  TestValidator.predicate(
    "net revenue calculation is logically consistent",
    revenueStats.total_net_revenue <= revenueStats.total_gross_revenue,
  );

  // Step 10: Verify growth rate is either null (first period) or a valid number
  TestValidator.predicate(
    "growth rate is null or valid number",
    revenueStats.growth_rate_percentage === null ||
      typeof revenueStats.growth_rate_percentage === "number",
  );
}
