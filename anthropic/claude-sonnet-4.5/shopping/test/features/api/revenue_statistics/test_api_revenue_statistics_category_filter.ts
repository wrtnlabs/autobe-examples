import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRevenueStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRevenueStatistics";

/**
 * Test revenue statistics filtered by product category.
 *
 * This test validates that the revenue statistics endpoint correctly filters
 * financial analytics by product category. It ensures that when a category_id
 * is provided in the request, the returned statistics reflect only transactions
 * involving products from that specific category.
 *
 * Process:
 *
 * 1. Create and authenticate an admin user
 * 2. Request revenue statistics with category_id filter
 * 3. Validate response structure and metrics
 * 4. Verify statistics are properly scoped to the specified category
 */
export async function test_api_revenue_statistics_category_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateData = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" satisfies
      | "super_admin"
      | "moderator"
      | "support",
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreateData,
  });
  typia.assert(admin);

  // Step 2: Generate revenue statistics request with category filter
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const revenueRequest = {
    start_date: thirtyDaysAgo.toISOString().split("T")[0],
    end_date: today.toISOString().split("T")[0],
    category_id: categoryId,
  } satisfies IShoppingMallRevenueStatistics.IRequest;

  // Step 3: Request revenue statistics with category filter
  const revenueStats =
    await api.functional.shoppingMall.admin.statistics.revenue.index(
      connection,
      {
        body: revenueRequest,
      },
    );
  typia.assert(revenueStats);

  // Step 4: Validate response structure and metrics
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
    "total_order_count should be non-negative",
    revenueStats.total_order_count >= 0,
  );
  TestValidator.predicate(
    "total_transaction_count should be non-negative",
    revenueStats.total_transaction_count >= 0,
  );
  TestValidator.predicate(
    "average_order_value should be non-negative",
    revenueStats.average_order_value >= 0,
  );

  // Step 5: Verify period dates match request
  TestValidator.equals(
    "period start date matches request",
    revenueStats.period_start_date.split("T")[0],
    revenueRequest.start_date,
  );
  TestValidator.equals(
    "period end date matches request",
    revenueStats.period_end_date.split("T")[0],
    revenueRequest.end_date,
  );
}
