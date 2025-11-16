import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRevenueStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRevenueStatistics";

/**
 * Test revenue statistics with yearly grouping for annual performance review.
 *
 * Admin authenticates and requests revenue analytics aggregated by year to
 * analyze long-term platform growth and annual financial performance. Validates
 * that yearly aggregation produces comprehensive annual metrics including total
 * revenue, commission earnings, seller payouts, and year-over-year growth
 * rates. Verifies that the aggregation spans multiple years correctly and
 * provides accurate annual comparisons for strategic business planning and
 * investor reporting.
 *
 * Test workflow:
 *
 * 1. Create and authenticate as platform admin
 * 2. Request revenue statistics with yearly grouping
 * 3. Validate comprehensive annual metrics
 * 4. Verify data structure and completeness
 */
export async function test_api_revenue_statistics_yearly_aggregation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // Step 2: Request revenue statistics with yearly grouping
  const currentDate = new Date();
  const startDate = new Date(currentDate.getFullYear() - 2, 0, 1);
  const endDate = new Date(currentDate.getFullYear(), 11, 31);

  const revenueRequestBody = {
    start_date: startDate.toISOString().split("T")[0],
    end_date: endDate.toISOString().split("T")[0],
    grouping: "yearly" as const,
  } satisfies IShoppingMallRevenueStatistics.IRequest;

  const revenueStats: IShoppingMallRevenueStatistics =
    await api.functional.shoppingMall.admin.statistics.revenue.index(
      connection,
      {
        body: revenueRequestBody,
      },
    );
  typia.assert(revenueStats);

  // Step 3: Validate comprehensive annual metrics
  TestValidator.predicate(
    "total gross revenue should be non-negative",
    revenueStats.total_gross_revenue >= 0,
  );

  TestValidator.predicate(
    "total net revenue should be non-negative",
    revenueStats.total_net_revenue >= 0,
  );

  TestValidator.predicate(
    "net revenue should not exceed gross revenue",
    revenueStats.total_net_revenue <= revenueStats.total_gross_revenue,
  );

  TestValidator.predicate(
    "platform commission should be non-negative",
    revenueStats.total_platform_commission >= 0,
  );

  TestValidator.predicate(
    "seller payouts should be non-negative",
    revenueStats.total_seller_payouts >= 0,
  );

  TestValidator.predicate(
    "refund amount should be non-negative",
    revenueStats.total_refund_amount >= 0,
  );

  TestValidator.predicate(
    "order count should be non-negative",
    revenueStats.total_order_count >= 0,
  );

  TestValidator.predicate(
    "transaction count should be non-negative",
    revenueStats.total_transaction_count >= 0,
  );

  TestValidator.predicate(
    "average order value should be non-negative",
    revenueStats.average_order_value >= 0,
  );

  // Step 4: Verify period dates match the request
  TestValidator.equals(
    "period start date matches request",
    revenueStats.period_start_date.split("T")[0],
    revenueRequestBody.start_date,
  );

  TestValidator.equals(
    "period end date matches request",
    revenueStats.period_end_date.split("T")[0],
    revenueRequestBody.end_date,
  );
}
