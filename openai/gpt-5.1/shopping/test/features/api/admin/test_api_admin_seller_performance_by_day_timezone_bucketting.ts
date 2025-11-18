import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPerformanceByDayStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceByDayStatistics";
import type { IShoppingMallSellerPerformanceByDayStatisticsSellerFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceByDayStatisticsSellerFilter";

/**
 * Validate admin authentication and structurally verify seller performance
 * statistics timezone metadata and aggregates.
 *
 * Business context:
 *
 * - The intended business scenario is to call GET
 *   /shoppingMall/admin/statistics/sellerPerformanceByDay with different
 *   timezone parameters and confirm that daily bucketing behaves as expected.
 * - However, the only available SDK operation is POST /auth/admin/join, so this
 *   test focuses on what is feasible: admin authentication plus structural
 *   validation of the seller performance statistics DTO using simulated data.
 *
 * Steps implemented:
 *
 * 1. Register an admin via POST /auth/admin/join and assert the
 *    IShoppingMallAdmin.IAuthorized response, including presence of an access
 *    token.
 * 2. Generate two simulated statistics payloads of type
 *    IShoppingMallSellerPerformanceByDayStatistics using typia.random, then
 *    override their timezone/startDate/endDate fields to represent two
 *    different reporting timezones: "UTC" and "Asia/Seoul" over a fixed date
 *    range.
 * 3. Assert that each payload’s timezone property matches the expected value.
 * 4. For each payload, validate that:
 *
 *    - Rows is an array (may be empty),
 *    - Each row.date lies within the [startDate, endDate] window using ISO date
 *         comparison,
 *    - Non-negative integer metrics (totalOrders, totalOrderItems, refundCount,
 *         cancellationCount) are >= 0,
 *    - When a summary object exists, its aggregates are at least as large as the
 *         sums of the corresponding row metrics.
 * 5. Finally, assert that the UTC and Asia/Seoul rows collections are not
 *    structurally identical, loosely mirroring the expectation that different
 *    timezones typically produce different daily bucketing.
 */
export async function test_api_admin_seller_performance_by_day_timezone_bucketting(
  connection: api.IConnection,
) {
  // 1. Admin registration via POST /auth/admin/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  TestValidator.predicate(
    "admin token should contain non-empty access token",
    () =>
      typeof admin.token.access === "string" && admin.token.access.length > 0,
  );

  // 2. Simulate statistics payloads for two different timezones
  const utcStats =
    typia.random<IShoppingMallSellerPerformanceByDayStatistics>();
  const seoulStats =
    typia.random<IShoppingMallSellerPerformanceByDayStatistics>();
  typia.assert<IShoppingMallSellerPerformanceByDayStatistics>(utcStats);
  typia.assert<IShoppingMallSellerPerformanceByDayStatistics>(seoulStats);

  // Fixed reporting window for both payloads
  const startDate = "2025-01-01" as string & tags.Format<"date">;
  const endDate = "2025-01-31" as string & tags.Format<"date">;

  utcStats.startDate = startDate;
  utcStats.endDate = endDate;
  utcStats.timezone = "UTC";

  seoulStats.startDate = startDate;
  seoulStats.endDate = endDate;
  seoulStats.timezone = "Asia/Seoul";

  // 3. Validate timezone field echo
  TestValidator.equals(
    "UTC statistics should report timezone UTC",
    utcStats.timezone,
    "UTC",
  );
  TestValidator.equals(
    "Asia/Seoul statistics should report timezone Asia/Seoul",
    seoulStats.timezone,
    "Asia/Seoul",
  );

  // Helper to validate a single statistics payload
  const validateStats = async (
    titlePrefix: string,
    stats: IShoppingMallSellerPerformanceByDayStatistics,
  ): Promise<void> => {
    TestValidator.predicate(
      `${titlePrefix}: rows should be an array (possibly empty)`,
      Array.isArray(stats.rows),
    );

    let totalOrders = 0;
    let totalOrderItems = 0;
    let totalGMV = 0;
    let totalNetEarnings = 0;
    let totalCommission = 0;
    let totalRefundAmount = 0;

    for (const row of stats.rows) {
      TestValidator.predicate(
        `${titlePrefix}: row.date within [startDate, endDate]`,
        () => row.date >= startDate && row.date <= endDate,
      );

      TestValidator.predicate(
        `${titlePrefix}: totalOrders is non-negative`,
        () => row.totalOrders >= 0,
      );
      TestValidator.predicate(
        `${titlePrefix}: totalOrderItems is non-negative`,
        () => row.totalOrderItems >= 0,
      );
      TestValidator.predicate(
        `${titlePrefix}: refundCount is non-negative`,
        () => row.refundCount >= 0,
      );
      TestValidator.predicate(
        `${titlePrefix}: cancellationCount is non-negative`,
        () => row.cancellationCount >= 0,
      );

      totalOrders += row.totalOrders;
      totalOrderItems += row.totalOrderItems;
      totalGMV += row.grossMerchandiseValue;
      totalNetEarnings += row.netEarnings;
      totalCommission += row.commissionAmount;
      totalRefundAmount += row.refundAmount;
    }

    if (stats.summary) {
      const summary = stats.summary;
      TestValidator.predicate(
        `${titlePrefix}: summary.totalOrders >= sum(row.totalOrders)`,
        () => summary.totalOrders >= totalOrders,
      );
      TestValidator.predicate(
        `${titlePrefix}: summary.totalOrderItems >= sum(row.totalOrderItems)`,
        () => summary.totalOrderItems >= totalOrderItems,
      );
      TestValidator.predicate(
        `${titlePrefix}: summary.totalGrossMerchandiseValue >= sum(row.grossMerchandiseValue)`,
        () => summary.totalGrossMerchandiseValue >= totalGMV,
      );
      TestValidator.predicate(
        `${titlePrefix}: summary.totalNetEarnings >= sum(row.netEarnings)`,
        () => summary.totalNetEarnings >= totalNetEarnings,
      );
      TestValidator.predicate(
        `${titlePrefix}: summary.totalCommissionAmount >= sum(row.commissionAmount)`,
        () => summary.totalCommissionAmount >= totalCommission,
      );
      TestValidator.predicate(
        `${titlePrefix}: summary.totalRefundAmount >= sum(row.refundAmount)`,
        () => summary.totalRefundAmount >= totalRefundAmount,
      );
    }
  };

  await validateStats("UTC", utcStats);
  await validateStats("Asia/Seoul", seoulStats);

  // 5. Ensure the two statistics payloads are not structurally identical,
  // approximating the expectation that timezone changes typically affect daily
  // bucketing.
  TestValidator.notEquals(
    "UTC and Asia/Seoul statistics rows should differ structurally",
    utcStats.rows,
    seoulStats.rows,
  );
}
