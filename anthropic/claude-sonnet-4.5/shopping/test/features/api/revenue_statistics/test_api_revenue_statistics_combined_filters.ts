import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRevenueStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRevenueStatistics";

/**
 * Test revenue statistics with multiple filters applied simultaneously.
 *
 * This test validates that the revenue statistics API correctly handles
 * combined filters (seller_id and category_id) to produce metrics for a
 * specific seller's performance within a particular product category. The test
 * ensures that multi-dimensional filtering enables detailed business
 * intelligence queries for targeted performance analysis.
 *
 * Steps:
 *
 * 1. Authenticate as admin to access revenue statistics endpoint
 * 2. Prepare date range for analytics query (30-day period)
 * 3. Generate random seller_id and category_id for combined filtering
 * 4. Request revenue statistics with both filters applied simultaneously
 * 5. Validate response structure and all financial metrics
 * 6. Verify period dates in response match the requested date range
 */
export async function test_api_revenue_statistics_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
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

  // Step 2: Prepare date range for analytics (30-day period)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const startDateString = startDate.toISOString().split("T")[0];
  const endDateString = endDate.toISOString().split("T")[0];

  // Step 3: Generate random seller_id and category_id for combined filtering
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Request revenue statistics with both filters applied simultaneously
  const revenueStats: IShoppingMallRevenueStatistics =
    await api.functional.shoppingMall.admin.statistics.revenue.index(
      connection,
      {
        body: {
          start_date: startDateString,
          end_date: endDateString,
          seller_id: sellerId,
          category_id: categoryId,
        } satisfies IShoppingMallRevenueStatistics.IRequest,
      },
    );

  // Step 5: Validate response structure and all financial metrics
  typia.assert(revenueStats);

  // Step 6: Verify period dates in response match the requested date range
  TestValidator.equals(
    "period start date matches request",
    revenueStats.period_start_date.split("T")[0],
    startDateString,
  );
  TestValidator.equals(
    "period end date matches request",
    revenueStats.period_end_date.split("T")[0],
    endDateString,
  );

  // Verify key metrics are present and valid
  TestValidator.predicate(
    "total gross revenue is non-negative",
    revenueStats.total_gross_revenue >= 0,
  );
  TestValidator.predicate(
    "total net revenue is non-negative",
    revenueStats.total_net_revenue >= 0,
  );
  TestValidator.predicate(
    "platform commission is non-negative",
    revenueStats.total_platform_commission >= 0,
  );
  TestValidator.predicate(
    "seller payouts is non-negative",
    revenueStats.total_seller_payouts >= 0,
  );
  TestValidator.predicate(
    "order count is non-negative",
    revenueStats.total_order_count >= 0,
  );
  TestValidator.predicate(
    "average order value is non-negative",
    revenueStats.average_order_value >= 0,
  );
}
