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
 * Test seller earnings statistics commission rate calculation accuracy.
 *
 * This test validates that the average_commission_rate metric is calculated
 * correctly as (total_platform_commissions / total_gross_revenue) * 100 and
 * falls within the valid 0-100 percentage range. It ensures the platform
 * monetization insights are accurate for financial analysis.
 *
 * Test workflow:
 *
 * 1. Admin authentication - create admin account
 * 2. Request seller earnings statistics
 * 3. Validate commission rate calculation formula
 * 4. Verify commission rate is within 0-100 range
 * 5. Ensure data integrity for financial reporting
 */
export async function test_api_seller_earnings_statistics_commission_rate_calculation(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
  const adminCreateData = {
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
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 2: Request seller earnings statistics with various filters
  const topSellersLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;

  const statisticsRequest = {
    aggregation_level: "monthly" as const,
    include_top_sellers: true,
    top_sellers_limit: topSellersLimit,
  } satisfies IShoppingMallSellerEarningsStatistics.IRequest;

  const statistics: IShoppingMallSellerEarningsStatistics =
    await api.functional.shoppingMall.admin.statistics.seller_earnings.index(
      connection,
      {
        body: statisticsRequest,
      },
    );
  typia.assert(statistics);

  // Step 3: Validate commission rate calculation accuracy
  // Formula: average_commission_rate = (total_platform_commissions / total_gross_revenue) * 100
  if (statistics.total_gross_revenue > 0) {
    const expectedCommissionRate =
      (statistics.total_platform_commissions / statistics.total_gross_revenue) *
      100;

    const tolerance = 0.01;
    const actualRate = statistics.average_commission_rate;
    const rateDifference = Math.abs(actualRate - expectedCommissionRate);

    TestValidator.predicate(
      "commission rate calculation matches formula",
      rateDifference <= tolerance,
    );
  }

  // Step 4: Verify commission rate is within valid 0-100 percentage range
  TestValidator.predicate(
    "commission rate is within valid range 0-100",
    statistics.average_commission_rate >= 0 &&
      statistics.average_commission_rate <= 100,
  );

  // Step 5: Validate overall data integrity
  TestValidator.predicate(
    "total gross revenue is non-negative",
    statistics.total_gross_revenue >= 0,
  );

  TestValidator.predicate(
    "total platform commissions is non-negative",
    statistics.total_platform_commissions >= 0,
  );

  const netRevenueExpected =
    statistics.total_gross_revenue - statistics.total_platform_commissions;
  TestValidator.predicate(
    "total net revenue equals gross minus commissions",
    Math.abs(statistics.total_net_revenue - netRevenueExpected) < 0.01,
  );

  // Validate time series data structure
  TestValidator.predicate(
    "time series data is present",
    Array.isArray(statistics.time_series_data),
  );

  // Validate top sellers data if requested
  if (statisticsRequest.include_top_sellers && statistics.top_earning_sellers) {
    TestValidator.predicate(
      "top sellers list does not exceed requested limit",
      statistics.top_earning_sellers.length <= topSellersLimit,
    );
  }
}
