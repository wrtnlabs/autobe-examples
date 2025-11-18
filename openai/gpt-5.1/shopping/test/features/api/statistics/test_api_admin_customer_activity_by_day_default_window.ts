import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomerActivityDailyStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerActivityDailyStatistics";

/**
 * Validate default-window customer activity daily statistics for admins.
 *
 * Business goals:
 *
 * - When an admin calls the customer-activity-by-day statistics endpoint without
 *   any date range query parameters, the backend must apply a reasonable
 *   default reporting window (for example, the last N days) and populate
 *   `startDate`, `endDate`, `timezone`, `rows`, and `summary` consistently.
 * - The summary aggregates must match the per-row data, and average daily metrics
 *   must be mathematically coherent relative to `summary.totalDays`.
 * - Multiple invocations of the same endpoint under a stable dataset should be
 *   idempotent, returning structurally identical results.
 *
 * High-level flow:
 *
 * 1. Register an admin via POST /auth/admin/join to establish an authenticated
 *    context and seed the connection with a valid JWT.
 * 2. Call GET /shoppingMall/admin/statistics/customerActivityByDay
 *    (api.functional.shoppingMall.admin.statistics.customerActivityByDay.index)
 *    without any query parameters to exercise the default-window behavior.
 * 3. Validate structural correctness and logical invariants:
 *
 *    - `startDate` and `endDate` define a non-negative inclusive date range.
 *    - All row dates fall inside [startDate, endDate].
 *    - `summary.totalDays` is non-negative and not greater than the full calendar
 *         day span between `startDate` and `endDate`.
 *    - If summary is present, aggregated totals match the sums across rows.
 *    - When `summary.totalDays > 0`, averageDaily* fields (when defined) approximate
 *         totals/totalDays within a small floating-point tolerance.
 * 4. Call the statistics endpoint a second time and confirm that results are
 *    stable (idempotent) when no state changes occur, using deep equality.
 */
export async function test_api_admin_customer_activity_by_day_default_window(
  connection: api.IConnection,
) {
  // 1. Admin registration / authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/dashboard",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. First statistics fetch with default window
  const firstStats: IShoppingMallCustomerActivityDailyStatistics =
    await api.functional.shoppingMall.admin.statistics.customerActivityByDay.index(
      connection,
    );
  typia.assert(firstStats);

  const { startDate, endDate, timezone, rows, summary } = firstStats;

  // Basic structural checks
  TestValidator.predicate(
    "timezone should be a non-empty string",
    () => typeof timezone === "string" && timezone.length > 0,
  );

  // Compute inclusive day-span between startDate and endDate (YYYY-MM-DD)
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const millisPerDay = 24 * 60 * 60 * 1000;
  const diffMillis = end.getTime() - start.getTime();

  TestValidator.predicate(
    "endDate should not be before startDate",
    () => diffMillis >= 0,
  );

  const calendarSpanDays = Math.floor(diffMillis / millisPerDay) + 1;

  TestValidator.predicate(
    "calendarSpanDays is non-negative",
    () => calendarSpanDays >= 0,
  );

  // rows.length must be within plausible bounds
  TestValidator.predicate(
    "number of rows must not exceed calendarSpanDays",
    () => rows.length <= calendarSpanDays,
  );

  // Each row.date must be within [startDate, endDate]
  for (const row of rows) {
    const rowDate = new Date(`${row.date}T00:00:00.000Z`);
    TestValidator.predicate(
      `row date ${row.date} is within [startDate, endDate]`,
      () =>
        rowDate.getTime() >= start.getTime() &&
        rowDate.getTime() <= end.getTime(),
    );
  }

  // 3. Summary vs rows consistency
  if (summary !== undefined) {
    const {
      totalDays,
      totalNewRegisteredCustomers,
      totalActiveCustomers,
      totalOrderingCustomers,
      totalOrders,
      totalOrderItems,
      totalGrossMerchandiseValue,
      averageDailyActiveCustomers,
      averageDailyOrderingCustomers,
      averageDailyOrders,
      averageDailyGrossMerchandiseValue,
    } = summary;

    TestValidator.predicate(
      "summary.totalDays is non-negative",
      () => totalDays >= 0,
    );

    TestValidator.predicate(
      "summary.totalDays does not exceed calendarSpanDays",
      () => totalDays <= calendarSpanDays,
    );

    TestValidator.predicate(
      "rows.length does not exceed summary.totalDays when totalDays > 0",
      () => totalDays === 0 || rows.length <= totalDays,
    );

    // Aggregate row metrics
    let sumNewRegisteredCustomers = 0;
    let sumActiveCustomers = 0;
    let sumOrderingCustomers = 0;
    let sumTotalOrders = 0;
    let sumTotalOrderItems = 0;
    let sumGMV = 0;

    for (const row of rows) {
      sumNewRegisteredCustomers += row.newRegisteredCustomers;
      sumActiveCustomers += row.activeCustomers;
      sumOrderingCustomers += row.orderingCustomers;
      sumTotalOrders += row.totalOrders;
      sumTotalOrderItems += row.totalOrderItems;
      sumGMV += row.grossMerchandiseValue;
    }

    // Totals equality checks (actual first, expected second)
    TestValidator.equals(
      "summary.totalNewRegisteredCustomers equals sum of rows",
      totalNewRegisteredCustomers,
      sumNewRegisteredCustomers,
    );

    TestValidator.equals(
      "summary.totalActiveCustomers equals sum of rows",
      totalActiveCustomers,
      sumActiveCustomers,
    );

    TestValidator.equals(
      "summary.totalOrderingCustomers equals sum of rows",
      totalOrderingCustomers,
      sumOrderingCustomers,
    );

    TestValidator.equals(
      "summary.totalOrders equals sum of rows",
      totalOrders,
      sumTotalOrders,
    );

    TestValidator.equals(
      "summary.totalOrderItems equals sum of rows",
      totalOrderItems,
      sumTotalOrderItems,
    );

    TestValidator.equals(
      "summary.totalGrossMerchandiseValue equals sum of rows",
      totalGrossMerchandiseValue,
      sumGMV,
    );

    const epsilon = 1e-6;

    if (totalDays > 0) {
      const expectedAvgActive = sumActiveCustomers / totalDays;
      const expectedAvgOrdering = sumOrderingCustomers / totalDays;
      const expectedAvgOrders = sumTotalOrders / totalDays;
      const expectedAvgGMV = sumGMV / totalDays;

      if (averageDailyActiveCustomers !== undefined) {
        TestValidator.predicate(
          "averageDailyActiveCustomers matches totalActiveCustomers / totalDays",
          () =>
            Math.abs(averageDailyActiveCustomers - expectedAvgActive) <=
            epsilon,
        );
      }

      if (averageDailyOrderingCustomers !== undefined) {
        TestValidator.predicate(
          "averageDailyOrderingCustomers matches totalOrderingCustomers / totalDays",
          () =>
            Math.abs(averageDailyOrderingCustomers - expectedAvgOrdering) <=
            epsilon,
        );
      }

      if (averageDailyOrders !== undefined) {
        TestValidator.predicate(
          "averageDailyOrders matches totalOrders / totalDays",
          () => Math.abs(averageDailyOrders - expectedAvgOrders) <= epsilon,
        );
      }

      if (averageDailyGrossMerchandiseValue !== undefined) {
        TestValidator.predicate(
          "averageDailyGrossMerchandiseValue matches totalGrossMerchandiseValue / totalDays",
          () =>
            Math.abs(averageDailyGrossMerchandiseValue - expectedAvgGMV) <=
            epsilon,
        );
      }
    } else {
      // When totalDays === 0, any defined averages must be non-negative
      if (averageDailyActiveCustomers !== undefined) {
        TestValidator.predicate(
          "averageDailyActiveCustomers non-negative when totalDays = 0",
          () => averageDailyActiveCustomers >= 0,
        );
      }
      if (averageDailyOrderingCustomers !== undefined) {
        TestValidator.predicate(
          "averageDailyOrderingCustomers non-negative when totalDays = 0",
          () => averageDailyOrderingCustomers >= 0,
        );
      }
      if (averageDailyOrders !== undefined) {
        TestValidator.predicate(
          "averageDailyOrders non-negative when totalDays = 0",
          () => averageDailyOrders >= 0,
        );
      }
      if (averageDailyGrossMerchandiseValue !== undefined) {
        TestValidator.predicate(
          "averageDailyGrossMerchandiseValue non-negative when totalDays = 0",
          () => averageDailyGrossMerchandiseValue >= 0,
        );
      }
    }
  }

  // 4. Idempotency: second call must return same statistics under stable data
  const secondStats: IShoppingMallCustomerActivityDailyStatistics =
    await api.functional.shoppingMall.admin.statistics.customerActivityByDay.index(
      connection,
    );
  typia.assert(secondStats);

  TestValidator.equals(
    "customerActivityByDay index is idempotent for stable data",
    secondStats,
    firstStats,
  );
}
