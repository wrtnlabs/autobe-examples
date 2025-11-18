import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCampaignPerformanceDailyPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCampaignPerformanceDailyPoint";
import type { IShoppingMallCampaignPerformanceDailySeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCampaignPerformanceDailySeries";
import type { IShoppingMallCampaignPerformanceDailyStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCampaignPerformanceDailyStatistics";

/**
 * Enforce that campaign performance by day statistics are only consumed through
 * a properly authenticated admin connection, relying solely on the SDK-managed
 * Authorization behavior.
 *
 * Business goal:
 *
 * - Ensure that an admin can call GET
 *   /shoppingMall/admin/statistics/campaignPerformanceByDay and receive a
 *   structurally valid IShoppingMallCampaignPerformanceDailyStatistics payload
 *   populated according to the snapshot DTOs.
 * - Use the same connection instance before and after admin join():
 *
 *   - Before join: perform a light smoke call in simulate mode to ensure the
 *       endpoint wiring is correct.
 *   - After join: rely on api.functional.auth.admin.join to embed the Authorization
 *       token into connection.headers, then call the statistics endpoint and
 *       validate the response.
 *
 * Constraints and simplifications:
 *
 * - Test code must never touch connection.headers directly; only the SDK is
 *   allowed to manipulate headers.
 * - We do not simulate invalid or non-admin tokens because there are no dedicated
 *   APIs for that and header mutation is prohibited.
 * - Instead of checking HTTP status codes, we focus on successful flow and
 *   structural/business validation of the returned statistics object.
 *
 * Steps:
 *
 * 1. Optionally perform a smoke test when connection.simulate === true by calling
 *    the statistics endpoint and asserting its type.
 * 2. Create an admin by calling api.functional.auth.admin.join with a randomly
 *    generated IShoppingMallAdminJoin.ICreate body. This also causes the SDK to
 *    set connection.headers.Authorization automatically.
 * 3. Call
 *    api.functional.shoppingMall.admin.statistics.campaignPerformanceByDay.index
 *    using the same connection and assert the response type with
 *    typia.assert<IShoppingMallCampaignPerformanceDailyStatistics>().
 * 4. Perform additional business sanity checks on the returned series:
 *
 *    - Items is an array (possibly empty).
 *    - For each series, periodStart and periodEnd are valid date strings (trusted
 *         via typia), and all points.statsDate values lie within that inclusive
 *         range.
 *    - Numeric counters (orderCount, paidOrderCount, newCustomerOrderCount) are
 *         non-negative, and paidOrderCount <= orderCount where comparing makes
 *         sense.
 */
export async function test_api_admin_campaign_performance_by_day_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Optional smoke test when running in simulate mode
  if (connection.simulate === true) {
    const simulatedStats: IShoppingMallCampaignPerformanceDailyStatistics =
      await api.functional.shoppingMall.admin.statistics.campaignPerformanceByDay.index(
        connection,
      );
    typia.assert<IShoppingMallCampaignPerformanceDailyStatistics>(
      simulatedStats,
    );
  }

  // 2. Register an admin and obtain an authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);
  typia.assert<IAuthorizationToken>(authorizedAdmin.token);

  // 3. Call the statistics endpoint with the now-authorized admin connection
  const stats: IShoppingMallCampaignPerformanceDailyStatistics =
    await api.functional.shoppingMall.admin.statistics.campaignPerformanceByDay.index(
      connection,
    );
  typia.assert<IShoppingMallCampaignPerformanceDailyStatistics>(stats);

  // 4. Business sanity checks on returned series
  const { items } = stats;
  TestValidator.predicate(
    "campaign series items is an array (possibly empty)",
    Array.isArray(items),
  );

  for (const series of items) {
    typia.assert<IShoppingMallCampaignPerformanceDailySeries>(series);

    const { periodStart, periodEnd, points } = series;
    TestValidator.predicate(
      "points is an array for each campaign series",
      Array.isArray(points),
    );

    // Convert date strings to Date objects for range comparisons
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    // Ensure startDate <= endDate
    TestValidator.predicate(
      "campaign periodStart is not after periodEnd",
      startDate.getTime() <= endDate.getTime(),
    );

    for (const point of points) {
      typia.assert<IShoppingMallCampaignPerformanceDailyPoint>(point);

      const pointDate = new Date(point.statsDate);
      TestValidator.predicate(
        "point statsDate lies within [periodStart, periodEnd] inclusive",
        pointDate.getTime() >= startDate.getTime() &&
          pointDate.getTime() <= endDate.getTime(),
      );

      // Non-negative counts and logically consistent relationships
      TestValidator.predicate(
        "orderCount is non-negative",
        point.orderCount >= 0,
      );
      TestValidator.predicate(
        "paidOrderCount is non-negative",
        point.paidOrderCount >= 0,
      );
      TestValidator.predicate(
        "newCustomerOrderCount is non-negative",
        point.newCustomerOrderCount >= 0,
      );
      TestValidator.predicate(
        "paidOrderCount does not exceed orderCount",
        point.paidOrderCount <= point.orderCount,
      );
    }
  }
}
