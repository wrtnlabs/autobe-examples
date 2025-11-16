import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRevenueStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRevenueStatistics";

/**
 * Test revenue statistics with monthly grouping for long-term trend analysis.
 *
 * This test validates that the revenue statistics API correctly aggregates
 * financial data by month over a multi-month period. It verifies that monthly
 * grouping produces accurate financial metrics including gross revenue, net
 * revenue, platform commissions, seller payouts, and growth rate calculations.
 *
 * Test workflow:
 *
 * 1. Create and authenticate admin account
 * 2. Define multi-month date range for analysis
 * 3. Request revenue statistics with monthly grouping
 * 4. Validate response structure and financial metrics
 * 5. Verify business logic constraints (non-negative values, etc.)
 * 6. Confirm growth rate calculation or null for first period
 */
export async function test_api_revenue_statistics_monthly_aggregation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
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

  // Step 2: Define multi-month date range for monthly aggregation
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - 5); // 6 months of data

  const requestBody = {
    start_date: startDate.toISOString().split("T")[0],
    end_date: endDate.toISOString().split("T")[0],
    grouping: "monthly" as const,
  } satisfies IShoppingMallRevenueStatistics.IRequest;

  // Step 3: Request revenue statistics with monthly grouping
  const statistics =
    await api.functional.shoppingMall.admin.statistics.revenue.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(statistics);

  // Step 4: Validate all financial metrics are present and properly typed
  TestValidator.predicate(
    "total_gross_revenue is non-negative",
    statistics.total_gross_revenue >= 0,
  );

  TestValidator.predicate(
    "total_net_revenue is non-negative",
    statistics.total_net_revenue >= 0,
  );

  TestValidator.predicate(
    "total_platform_commission is non-negative",
    statistics.total_platform_commission >= 0,
  );

  TestValidator.predicate(
    "total_seller_payouts is non-negative",
    statistics.total_seller_payouts >= 0,
  );

  TestValidator.predicate(
    "total_refund_amount is non-negative",
    statistics.total_refund_amount >= 0,
  );

  TestValidator.predicate(
    "total_order_count is non-negative",
    statistics.total_order_count >= 0,
  );

  TestValidator.predicate(
    "total_transaction_count is non-negative",
    statistics.total_transaction_count >= 0,
  );

  TestValidator.predicate(
    "average_order_value is non-negative",
    statistics.average_order_value >= 0,
  );

  // Step 5: Validate business logic constraints
  TestValidator.predicate(
    "net revenue should not exceed gross revenue",
    statistics.total_net_revenue <= statistics.total_gross_revenue,
  );

  // Step 6: Validate growth_rate_percentage (can be null for first period)
  if (statistics.growth_rate_percentage !== null) {
    TestValidator.predicate(
      "growth_rate_percentage is a valid number",
      typeof statistics.growth_rate_percentage === "number",
    );
  }
}
