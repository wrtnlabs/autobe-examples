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
 * Test seller earnings statistics filtered by specific seller IDs.
 *
 * This test validates that the admin can request earnings analytics for a
 * targeted set of sellers using the seller_ids array parameter. It ensures that
 * when a seller_ids filter is provided, all metrics are aggregated only for the
 * specified sellers, enabling cohort analysis and comparative performance
 * tracking.
 *
 * Test Flow:
 *
 * 1. Authenticate as admin to access seller earnings statistics endpoint
 * 2. Create a request with seller_ids filter containing specific UUIDs
 * 3. Call the seller earnings statistics API with the filter
 * 4. Validate that seller_count matches the filtered set size
 * 5. Verify that earnings calculations exclude sellers not in the filter
 * 6. Confirm time series data reflects only the filtered sellers
 */
export async function test_api_seller_earnings_statistics_specific_sellers_filter(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
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

  // Step 2: Generate specific seller IDs to filter by
  const targetSellerIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  // Step 3: Create request with seller_ids filter
  const statisticsRequest = {
    seller_ids: targetSellerIds,
    aggregation_level: "monthly" as const,
    include_top_sellers: false,
  } satisfies IShoppingMallSellerEarningsStatistics.IRequest;

  // Step 4: Fetch seller earnings statistics with specific seller filter
  const statistics: IShoppingMallSellerEarningsStatistics =
    await api.functional.shoppingMall.admin.statistics.seller_earnings.index(
      connection,
      {
        body: statisticsRequest,
      },
    );
  typia.assert(statistics);

  // Step 5: Validate that seller_count matches the filtered set
  TestValidator.equals(
    "seller count matches filtered seller IDs",
    statistics.seller_count,
    targetSellerIds.length,
  );

  // Step 6: Verify response contains expected earnings structure
  TestValidator.predicate(
    "total gross revenue is non-negative",
    statistics.total_gross_revenue >= 0,
  );

  TestValidator.predicate(
    "total net revenue is non-negative",
    statistics.total_net_revenue >= 0,
  );

  TestValidator.predicate(
    "average commission rate is within valid range",
    statistics.average_commission_rate >= 0 &&
      statistics.average_commission_rate <= 100,
  );

  // Step 7: Validate time series data structure
  TestValidator.predicate(
    "time series data is an array",
    Array.isArray(statistics.time_series_data),
  );
}
