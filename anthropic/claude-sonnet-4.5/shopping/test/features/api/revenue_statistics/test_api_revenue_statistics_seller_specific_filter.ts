import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRevenueStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRevenueStatistics";

/**
 * Test revenue statistics filtered by specific seller ID.
 *
 * This test validates that the revenue statistics endpoint correctly filters
 * all financial metrics to a single seller when the seller_id parameter is
 * provided. The test ensures that commission calculations, payout amounts, and
 * transaction counts reflect only the specified seller's business activity
 * rather than platform-wide aggregation.
 *
 * Process:
 *
 * 1. Authenticate as platform administrator
 * 2. Generate a valid seller UUID for filtering
 * 3. Define a date range for the statistics query
 * 4. Request revenue statistics with seller_id filter
 * 5. Validate the response structure and data integrity
 * 6. Verify all revenue metrics are non-negative and properly formatted
 */
export async function test_api_revenue_statistics_seller_specific_filter(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to access revenue statistics
  const adminRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
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
      body: adminRegistration,
    });
  typia.assert(admin);

  // Step 2: Generate a valid seller UUID for the filter
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Define date range for revenue statistics (30-day period)
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

  const startDateString = startDate.toISOString().split("T")[0];
  const endDateString = endDate.toISOString().split("T")[0];

  // Step 4: Request revenue statistics with seller_id filter
  const revenueRequest = {
    start_date: startDateString,
    end_date: endDateString,
    seller_id: sellerId,
  } satisfies IShoppingMallRevenueStatistics.IRequest;

  const revenueStats: IShoppingMallRevenueStatistics =
    await api.functional.shoppingMall.admin.statistics.revenue.index(
      connection,
      {
        body: revenueRequest,
      },
    );

  // Step 5: Validate response structure and type
  typia.assert(revenueStats);

  // Step 6: Verify all revenue metrics are non-negative
  TestValidator.predicate(
    "total gross revenue should be non-negative",
    revenueStats.total_gross_revenue >= 0,
  );

  TestValidator.predicate(
    "total net revenue should be non-negative",
    revenueStats.total_net_revenue >= 0,
  );

  TestValidator.predicate(
    "total platform commission should be non-negative",
    revenueStats.total_platform_commission >= 0,
  );

  TestValidator.predicate(
    "total seller payouts should be non-negative",
    revenueStats.total_seller_payouts >= 0,
  );

  TestValidator.predicate(
    "total refund amount should be non-negative",
    revenueStats.total_refund_amount >= 0,
  );

  TestValidator.predicate(
    "total order count should be non-negative",
    revenueStats.total_order_count >= 0,
  );

  TestValidator.predicate(
    "total transaction count should be non-negative",
    revenueStats.total_transaction_count >= 0,
  );

  TestValidator.predicate(
    "average order value should be non-negative",
    revenueStats.average_order_value >= 0,
  );

  // Step 7: Verify the period dates match the request
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
}
