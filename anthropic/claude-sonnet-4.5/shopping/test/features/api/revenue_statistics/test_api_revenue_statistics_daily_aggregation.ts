import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRevenueStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRevenueStatistics";

/**
 * Test revenue statistics retrieval with daily time-based aggregation.
 *
 * This test validates the revenue analytics endpoint for administrators,
 * specifically testing the daily aggregation functionality. The test ensures
 * that when requesting revenue statistics with daily grouping, the API returns
 * comprehensive financial metrics including gross revenue, net revenue,
 * platform commissions, seller payouts, refunds, transaction counts, and growth
 * rates.
 *
 * Test workflow:
 *
 * 1. Create and authenticate an admin account
 * 2. Define a date range for revenue analysis (30 days)
 * 3. Request revenue statistics with daily aggregation granularity
 * 4. Validate that all required financial metrics are present in the response
 * 5. Verify proper date-time formatting and data types
 */
export async function test_api_revenue_statistics_daily_aggregation(
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

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Prepare date range for analytics (30 days period)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = endDate.toISOString().split("T")[0];

  // Step 3: Request revenue statistics with daily aggregation
  const revenueRequest = {
    start_date: startDateStr,
    end_date: endDateStr,
    grouping: "daily" as const,
  } satisfies IShoppingMallRevenueStatistics.IRequest;

  const revenueStats: IShoppingMallRevenueStatistics =
    await api.functional.shoppingMall.admin.statistics.revenue.index(
      connection,
      {
        body: revenueRequest,
      },
    );
  typia.assert(revenueStats);

  // Step 4: Validate all required financial metrics are present
  TestValidator.predicate(
    "total_gross_revenue should be non-negative",
    revenueStats.total_gross_revenue >= 0,
  );

  TestValidator.predicate(
    "total_net_revenue should be non-negative",
    revenueStats.total_net_revenue >= 0,
  );

  TestValidator.predicate(
    "total_platform_commission should be non-negative",
    revenueStats.total_platform_commission >= 0,
  );

  TestValidator.predicate(
    "total_seller_payouts should be non-negative",
    revenueStats.total_seller_payouts >= 0,
  );

  TestValidator.predicate(
    "total_refund_amount should be non-negative",
    revenueStats.total_refund_amount >= 0,
  );

  TestValidator.predicate(
    "total_order_count should be non-negative integer",
    revenueStats.total_order_count >= 0 &&
      Number.isInteger(revenueStats.total_order_count),
  );

  TestValidator.predicate(
    "total_transaction_count should be non-negative integer",
    revenueStats.total_transaction_count >= 0 &&
      Number.isInteger(revenueStats.total_transaction_count),
  );

  TestValidator.predicate(
    "average_order_value should be non-negative",
    revenueStats.average_order_value >= 0,
  );

  // Step 5: Validate date fields are properly formatted
  TestValidator.predicate(
    "period_start_date should be valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(revenueStats.period_start_date),
  );

  TestValidator.predicate(
    "period_end_date should be valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(revenueStats.period_end_date),
  );
}
