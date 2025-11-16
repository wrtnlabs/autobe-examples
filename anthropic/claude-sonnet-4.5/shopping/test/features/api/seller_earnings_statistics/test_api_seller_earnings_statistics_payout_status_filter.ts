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
 * Test seller earnings statistics filtered by payout status.
 *
 * This test validates that the seller earnings statistics API correctly filters
 * data based on payout status (completed, pending, processing, failed). This
 * functionality is critical for financial reconciliation and monitoring payout
 * processing workflows.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin to access statistics endpoint
 * 2. Request earnings statistics filtered by "completed" payout status
 * 3. Validate response structure and completed payout metrics
 * 4. Request earnings statistics filtered by "pending" payout status
 * 5. Validate response structure and pending payout metrics
 * 6. Test additional statuses (processing, failed) to ensure comprehensive
 *    filtering
 * 7. Validate that the API successfully processes all payout status filter
 *    variations
 */
export async function test_api_seller_earnings_statistics_payout_status_filter(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Request statistics filtered by "completed" payout status
  const completedRequest = {
    payout_status: "completed",
    aggregation_level: RandomGenerator.pick([
      "daily",
      "weekly",
      "monthly",
      "yearly",
    ] as const),
  } satisfies IShoppingMallSellerEarningsStatistics.IRequest;

  const completedStats =
    await api.functional.shoppingMall.admin.statistics.seller_earnings.index(
      connection,
      {
        body: completedRequest,
      },
    );
  typia.assert(completedStats);

  // Step 3: Validate completed payout statistics structure
  TestValidator.predicate(
    "completed stats should have non-negative total payouts completed",
    completedStats.total_payouts_completed >= 0,
  );
  TestValidator.predicate(
    "completed stats should have non-negative payout count completed",
    completedStats.payout_count_completed >= 0,
  );
  TestValidator.predicate(
    "completed stats time series data should be an array",
    Array.isArray(completedStats.time_series_data),
  );

  // Step 4: Request statistics filtered by "pending" payout status
  const pendingRequest = {
    payout_status: "pending",
    aggregation_level: RandomGenerator.pick([
      "daily",
      "weekly",
      "monthly",
      "yearly",
    ] as const),
  } satisfies IShoppingMallSellerEarningsStatistics.IRequest;

  const pendingStats =
    await api.functional.shoppingMall.admin.statistics.seller_earnings.index(
      connection,
      {
        body: pendingRequest,
      },
    );
  typia.assert(pendingStats);

  // Step 5: Validate pending payout statistics structure
  TestValidator.predicate(
    "pending stats should have non-negative total payouts pending",
    pendingStats.total_payouts_pending >= 0,
  );
  TestValidator.predicate(
    "pending stats should have non-negative payout count pending",
    pendingStats.payout_count_pending >= 0,
  );
  TestValidator.predicate(
    "pending stats time series data should be an array",
    Array.isArray(pendingStats.time_series_data),
  );

  // Step 6: Request statistics filtered by "processing" payout status
  const processingRequest = {
    payout_status: "processing",
    aggregation_level: RandomGenerator.pick([
      "daily",
      "weekly",
      "monthly",
      "yearly",
    ] as const),
  } satisfies IShoppingMallSellerEarningsStatistics.IRequest;

  const processingStats =
    await api.functional.shoppingMall.admin.statistics.seller_earnings.index(
      connection,
      {
        body: processingRequest,
      },
    );
  typia.assert(processingStats);

  // Step 7: Request statistics filtered by "failed" payout status
  const failedRequest = {
    payout_status: "failed",
    aggregation_level: RandomGenerator.pick([
      "daily",
      "weekly",
      "monthly",
      "yearly",
    ] as const),
  } satisfies IShoppingMallSellerEarningsStatistics.IRequest;

  const failedStats =
    await api.functional.shoppingMall.admin.statistics.seller_earnings.index(
      connection,
      {
        body: failedRequest,
      },
    );
  typia.assert(failedStats);

  // Step 8: Validate all statistics responses are valid
  TestValidator.predicate(
    "all payout status filter variations return valid statistics",
    [completedStats, pendingStats, processingStats, failedStats].every(
      (stats) => stats.total_gross_revenue >= 0 && stats.seller_count >= 0,
    ),
  );
}
