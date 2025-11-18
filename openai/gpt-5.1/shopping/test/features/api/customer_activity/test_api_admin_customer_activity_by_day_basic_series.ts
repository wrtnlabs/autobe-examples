import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomerActivityDailyStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerActivityDailyStatistics";

/**
 * Validate basic daily customer activity statistics series for admin analytics.
 *
 * Business intent: Ensure that an authenticated shopping-mall administrator can
 * retrieve daily customer activity statistics and that the returned time-series
 * structure is self-consistent and free of customer-level PII.
 *
 * High-level flow:
 *
 * 1. Register a new admin via POST /auth/admin/join to obtain an authorized admin
 *    session (connection headers are updated by SDK).
 * 2. Call GET /shoppingMall/admin/statistics/customerActivityByDay once using that
 *    admin connection.
 * 3. Type-validate the response with typia.assert to guarantee it matches
 *    IShoppingMallCustomerActivityDailyStatistics.
 * 4. Perform business-level validations:
 *
 *    - StartDate <= endDate (ISO date strings)
 *    - Rows are sorted by date ascending
 *    - Each row.date lies within [startDate, endDate]
 *    - Required numeric fields are non-negative
 *    - If summary is present, its totals equal the sums of row fields and its daily
 *         averages are consistent with totals/totalDays
 *    - Confirm only aggregate metrics are surfaced (no obvious PII keys)
 */
export async function test_api_admin_customer_activity_by_day_basic_series(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // Leave ip undefined to let backend derive it; DTO allows ip?: ... | null | undefined
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Fetch customer activity daily statistics as this admin
  const stats: IShoppingMallCustomerActivityDailyStatistics =
    await api.functional.shoppingMall.admin.statistics.customerActivityByDay.index(
      connection,
    );
  typia.assert<IShoppingMallCustomerActivityDailyStatistics>(stats);

  const { startDate, endDate, timezone, rows, summary } = stats;

  // 3. Basic metadata sanity checks
  TestValidator.predicate(
    "startDate is non-empty string",
    () => typeof startDate === "string" && startDate.length > 0,
  );
  TestValidator.predicate(
    "endDate is non-empty string",
    () => typeof endDate === "string" && endDate.length > 0,
  );
  TestValidator.predicate(
    "timezone is non-empty string",
    () => typeof timezone === "string" && timezone.length > 0,
  );

  // Dates are ISO calendar dates, so lexicographical comparison matches chronology
  TestValidator.predicate(
    "startDate is not after endDate",
    () => startDate <= endDate,
  );

  // 4. Validate rows ordering and range when there is at least one row
  if (rows.length > 0) {
    // 4.1 Rows sorted ascending by date
    for (let i = 1; i < rows.length; ++i) {
      const prev = rows[i - 1];
      const curr = rows[i];
      TestValidator.predicate(
        `rows[${i - 1}].date <= rows[${i}].date`,
        () => prev.date <= curr.date,
      );
    }

    // 4.2 Each row.date within [startDate, endDate]
    for (let i = 0; i < rows.length; ++i) {
      const row = rows[i];
      TestValidator.predicate(
        `row[${i}].date is within [startDate, endDate]`,
        () => row.date >= startDate && row.date <= endDate,
      );

      // 4.3 Required numeric fields are non-negative according to DTO tags
      TestValidator.predicate(
        `row[${i}].newRegisteredCustomers >= 0`,
        () => row.newRegisteredCustomers >= 0,
      );
      TestValidator.predicate(
        `row[${i}].activeCustomers >= 0`,
        () => row.activeCustomers >= 0,
      );
      TestValidator.predicate(
        `row[${i}].orderingCustomers >= 0`,
        () => row.orderingCustomers >= 0,
      );
      TestValidator.predicate(
        `row[${i}].totalOrders >= 0`,
        () => row.totalOrders >= 0,
      );
      TestValidator.predicate(
        `row[${i}].totalOrderItems >= 0`,
        () => row.totalOrderItems >= 0,
      );
      TestValidator.predicate(
        `row[${i}].grossMerchandiseValue is not negative`,
        () => row.grossMerchandiseValue >= 0,
      );
    }

    // 4.4 PII check: ensure row keys do not contain obvious customer identifiers
    const probeRow = rows[0];
    const probeKeys = Object.keys(probeRow);
    TestValidator.predicate(
      "row does not expose obvious PII like customerId or email",
      () =>
        !probeKeys.includes("customerId") &&
        !probeKeys.includes("customer_id") &&
        !probeKeys.includes("email"),
    );
  }

  // 5. Validate summary aggregates when present
  if (summary !== undefined) {
    const totalsFromRows = rows.reduce(
      (acc, row) => {
        acc.newRegisteredCustomers += row.newRegisteredCustomers;
        acc.activeCustomers += row.activeCustomers;
        acc.orderingCustomers += row.orderingCustomers;
        acc.totalOrders += row.totalOrders;
        acc.totalOrderItems += row.totalOrderItems;
        acc.gmv += row.grossMerchandiseValue;
        return acc;
      },
      {
        newRegisteredCustomers: 0,
        activeCustomers: 0,
        orderingCustomers: 0,
        totalOrders: 0,
        totalOrderItems: 0,
        gmv: 0,
      },
    );

    TestValidator.equals(
      "summary.totalNewRegisteredCustomers equals sum of rows",
      summary.totalNewRegisteredCustomers,
      totalsFromRows.newRegisteredCustomers,
    );
    TestValidator.equals(
      "summary.totalActiveCustomers equals sum of rows",
      summary.totalActiveCustomers,
      totalsFromRows.activeCustomers,
    );
    TestValidator.equals(
      "summary.totalOrderingCustomers equals sum of rows",
      summary.totalOrderingCustomers,
      totalsFromRows.orderingCustomers,
    );
    TestValidator.equals(
      "summary.totalOrders equals sum of rows",
      summary.totalOrders,
      totalsFromRows.totalOrders,
    );
    TestValidator.equals(
      "summary.totalOrderItems equals sum of rows",
      summary.totalOrderItems,
      totalsFromRows.totalOrderItems,
    );
    TestValidator.equals(
      "summary.totalGrossMerchandiseValue equals sum of rows",
      summary.totalGrossMerchandiseValue,
      totalsFromRows.gmv,
    );

    // totalDays should be non-negative and at least rows.length or 0 if empty
    TestValidator.predicate(
      "summary.totalDays is non-negative",
      () => summary.totalDays >= 0,
    );
    TestValidator.predicate(
      "summary.totalDays is at least number of rows",
      () => summary.totalDays >= rows.length,
    );

    const epsilon = 1e-6;

    if (
      summary.averageDailyActiveCustomers !== undefined &&
      summary.totalDays > 0
    ) {
      const expected = summary.totalActiveCustomers / summary.totalDays;
      const actual = summary.averageDailyActiveCustomers;
      TestValidator.predicate(
        "summary.averageDailyActiveCustomers matches totalActiveCustomers/totalDays",
        () =>
          Math.abs(actual - expected) <=
          epsilon * Math.max(1, Math.abs(expected)),
      );
    }

    if (
      summary.averageDailyOrderingCustomers !== undefined &&
      summary.totalDays > 0
    ) {
      const expected = summary.totalOrderingCustomers / summary.totalDays;
      const actual = summary.averageDailyOrderingCustomers;
      TestValidator.predicate(
        "summary.averageDailyOrderingCustomers matches totalOrderingCustomers/totalDays",
        () =>
          Math.abs(actual - expected) <=
          epsilon * Math.max(1, Math.abs(expected)),
      );
    }

    if (summary.averageDailyOrders !== undefined && summary.totalDays > 0) {
      const expected = summary.totalOrders / summary.totalDays;
      const actual = summary.averageDailyOrders;
      TestValidator.predicate(
        "summary.averageDailyOrders matches totalOrders/totalDays",
        () =>
          Math.abs(actual - expected) <=
          epsilon * Math.max(1, Math.abs(expected)),
      );
    }

    if (
      summary.averageDailyGrossMerchandiseValue !== undefined &&
      summary.totalDays > 0
    ) {
      const expected = summary.totalGrossMerchandiseValue / summary.totalDays;
      const actual = summary.averageDailyGrossMerchandiseValue;
      TestValidator.predicate(
        "summary.averageDailyGrossMerchandiseValue matches totalGrossMerchandiseValue/totalDays",
        () =>
          Math.abs(actual - expected) <=
          epsilon * Math.max(1, Math.abs(expected)),
      );
    }
  }
}
