import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomerActivityDailyStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerActivityDailyStatistics";

export async function test_api_admin_customer_activity_by_day_engagement_and_conversion_ratios(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional, let backend derive it so we don't depend on specific formats
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Fetch daily customer activity statistics
  const stats: IShoppingMallCustomerActivityDailyStatistics =
    await api.functional.shoppingMall.admin.statistics.customerActivityByDay.index(
      connection,
    );
  typia.assert(stats);

  // Basic structural validations: startDate <= endDate is not strictly guaranteed,
  // but we can at least ensure rows fall within the documented range when possible.
  TestValidator.predicate(
    "statistics rows length is non-negative",
    stats.rows.length >= 0,
  );

  // If there is no summary or no rows, we cannot meaningfully validate ratios or averages.
  if (stats.rows.length === 0) {
    // When there are no rows, either summary is undefined or has totalDays === 0.
    if (stats.summary !== undefined) {
      TestValidator.equals(
        "summary.totalDays should be zero when no rows are present",
        stats.summary.totalDays,
        0,
      );
    }
    return;
  }

  // Helper for floating point comparisons
  const isApproximatelyEqual = (
    a: number,
    b: number,
    epsilon: number,
  ): boolean => {
    const diff = Math.abs(a - b);
    const scale = Math.max(1, Math.abs(a), Math.abs(b));
    return diff <= epsilon * scale;
  };

  // 3. Per-row validation of ratios and boolean flags
  for (const row of stats.rows) {
    typia.assert<IShoppingMallCustomerActivityDailyStatistics.IRow>(row);

    // orderingCustomerRatio: should be between 0 and 1, and roughly equal to orderingCustomers / activeCustomers
    if (row.activeCustomers > 0 && row.orderingCustomerRatio !== undefined) {
      TestValidator.predicate(
        "orderingCustomerRatio is within [0,1] when activeCustomers > 0",
        row.orderingCustomerRatio >= 0 && row.orderingCustomerRatio <= 1,
      );

      const expectedRatio = row.orderingCustomers / row.activeCustomers;
      TestValidator.predicate(
        "orderingCustomerRatio approximately equals orderingCustomers / activeCustomers",
        isApproximatelyEqual(row.orderingCustomerRatio, expectedRatio, 1e-6),
      );
    }

    // activeCustomerRatio: when present, enforce it lies in [0,1]. We cannot recompute it because
    // the eligible customer base (denominator) is not exposed.
    if (row.activeCustomerRatio !== undefined) {
      TestValidator.predicate(
        "activeCustomerRatio is within [0,1] when defined",
        row.activeCustomerRatio >= 0 && row.activeCustomerRatio <= 1,
      );
    }

    // isNewCustomer / hasRepeatOrders are optional booleans. typia.assert already validates them,
    // but we can include simple sanity checks when they are defined.
    if (row.isNewCustomer !== undefined) {
      TestValidator.predicate(
        "isNewCustomer flag, when defined, is either true or false",
        row.isNewCustomer === true || row.isNewCustomer === false,
      );
    }
    if (row.hasRepeatOrders !== undefined) {
      TestValidator.predicate(
        "hasRepeatOrders flag, when defined, is either true or false",
        row.hasRepeatOrders === true || row.hasRepeatOrders === false,
      );
    }

    // averageOrderValue, when present and totalOrders > 0, should be close to
    // grossMerchandiseValue / totalOrders.
    if (row.totalOrders > 0 && row.averageOrderValue !== undefined) {
      const expectedAov = row.grossMerchandiseValue / row.totalOrders;
      TestValidator.predicate(
        "averageOrderValue approximately equals GMV / totalOrders for the day",
        isApproximatelyEqual(row.averageOrderValue, expectedAov, 1e-6),
      );
    }
  }

  // 4. Summary-level consistency checks
  if (stats.summary !== undefined) {
    const summary = stats.summary;
    typia.assert<IShoppingMallCustomerActivityDailyStatistics.ISummary>(
      summary,
    );

    // totalDays should be non-negative and, in most reasonable implementations,
    // at least the number of distinct dates present in rows. We cannot strictly
    // enforce equality because the backend may represent days without data, but
    // we can assert that when totalDays > 0, there is at least one row.
    TestValidator.predicate(
      "summary.totalDays is non-negative",
      summary.totalDays >= 0,
    );

    if (summary.totalDays === 0) {
      // When totalDays is 0, no additional average relationships are enforced.
      return;
    }

    TestValidator.predicate(
      "summary.totalDays > 0 implies at least one row exists",
      stats.rows.length > 0,
    );

    const totalDays = summary.totalDays;

    // Average relationships, when averages are defined
    if (summary.averageDailyActiveCustomers !== undefined) {
      const expected = summary.totalActiveCustomers / totalDays;
      TestValidator.predicate(
        "averageDailyActiveCustomers approximately equals totalActiveCustomers / totalDays",
        isApproximatelyEqual(
          summary.averageDailyActiveCustomers,
          expected,
          1e-6,
        ),
      );
    }

    if (summary.averageDailyOrderingCustomers !== undefined) {
      const expected = summary.totalOrderingCustomers / totalDays;
      TestValidator.predicate(
        "averageDailyOrderingCustomers approximately equals totalOrderingCustomers / totalDays",
        isApproximatelyEqual(
          summary.averageDailyOrderingCustomers,
          expected,
          1e-6,
        ),
      );
    }

    if (summary.averageDailyOrders !== undefined) {
      const expected = summary.totalOrders / totalDays;
      TestValidator.predicate(
        "averageDailyOrders approximately equals totalOrders / totalDays",
        isApproximatelyEqual(summary.averageDailyOrders, expected, 1e-6),
      );
    }

    if (summary.averageDailyGrossMerchandiseValue !== undefined) {
      const expected = summary.totalGrossMerchandiseValue / totalDays;
      TestValidator.predicate(
        "averageDailyGrossMerchandiseValue approximately equals totalGrossMerchandiseValue / totalDays",
        isApproximatelyEqual(
          summary.averageDailyGrossMerchandiseValue,
          expected,
          1e-6,
        ),
      );
    }
  }
}
