import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomerActivityDailyStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerActivityDailyStatistics";

export async function test_api_admin_customer_activity_by_day_empty_range(
  connection: api.IConnection,
) {
  // 1. Authenticate as an admin via join
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<IShoppingMallAdminJoin.ICreate>(),
    });
  typia.assert(admin);

  // 2. Call the customer-activity-by-day statistics endpoint
  const stats: IShoppingMallCustomerActivityDailyStatistics =
    await api.functional.shoppingMall.admin.statistics.customerActivityByDay.index(
      connection,
    );
  typia.assert(stats);

  // 3. Basic structural predicates
  TestValidator.predicate(
    "rows length must be non-negative",
    stats.rows.length >= 0,
  );

  TestValidator.predicate(
    "startDate must be non-empty string",
    typeof stats.startDate === "string" && stats.startDate.length > 0,
  );

  TestValidator.predicate(
    "endDate must be non-empty string",
    typeof stats.endDate === "string" && stats.endDate.length > 0,
  );

  TestValidator.predicate(
    "timezone must be non-empty string",
    typeof stats.timezone === "string" && stats.timezone.length > 0,
  );

  // 4. Per-row business invariants when there are any rows
  for (const row of stats.rows) {
    // date must be between startDate and endDate (lexicographically for YYYY-MM-DD)
    TestValidator.predicate(
      "row.date must be greater than or equal to startDate",
      row.date >= stats.startDate,
    );
    TestValidator.predicate(
      "row.date must be less than or equal to endDate",
      row.date <= stats.endDate,
    );

    TestValidator.predicate(
      "newRegisteredCustomers must be >= 0",
      row.newRegisteredCustomers >= 0,
    );
    TestValidator.predicate(
      "activeCustomers must be >= 0",
      row.activeCustomers >= 0,
    );
    TestValidator.predicate(
      "orderingCustomers must be >= 0",
      row.orderingCustomers >= 0,
    );
    TestValidator.predicate("totalOrders must be >= 0", row.totalOrders >= 0);
    TestValidator.predicate(
      "totalOrderItems must be >= 0",
      row.totalOrderItems >= 0,
    );
    TestValidator.predicate(
      "grossMerchandiseValue must be >= 0",
      row.grossMerchandiseValue >= 0,
    );
  }

  // 5. Summary-level validations
  if (stats.summary !== undefined) {
    const summary = stats.summary;

    TestValidator.predicate(
      "summary.totalDays must be >= 0",
      summary.totalDays >= 0,
    );
    TestValidator.predicate(
      "summary.totalNewRegisteredCustomers must be >= 0",
      summary.totalNewRegisteredCustomers >= 0,
    );
    TestValidator.predicate(
      "summary.totalActiveCustomers must be >= 0",
      summary.totalActiveCustomers >= 0,
    );
    TestValidator.predicate(
      "summary.totalOrderingCustomers must be >= 0",
      summary.totalOrderingCustomers >= 0,
    );
    TestValidator.predicate(
      "summary.totalOrders must be >= 0",
      summary.totalOrders >= 0,
    );
    TestValidator.predicate(
      "summary.totalOrderItems must be >= 0",
      summary.totalOrderItems >= 0,
    );
    TestValidator.predicate(
      "summary.totalGrossMerchandiseValue must be >= 0",
      summary.totalGrossMerchandiseValue >= 0,
    );

    // If there are no rows, we expect all summary counters to be zero
    if (stats.rows.length === 0) {
      TestValidator.equals(
        "when rows empty, totalDays should be zero",
        summary.totalDays,
        0,
      );
      TestValidator.equals(
        "when rows empty, totalNewRegisteredCustomers should be zero",
        summary.totalNewRegisteredCustomers,
        0,
      );
      TestValidator.equals(
        "when rows empty, totalActiveCustomers should be zero",
        summary.totalActiveCustomers,
        0,
      );
      TestValidator.equals(
        "when rows empty, totalOrderingCustomers should be zero",
        summary.totalOrderingCustomers,
        0,
      );
      TestValidator.equals(
        "when rows empty, totalOrders should be zero",
        summary.totalOrders,
        0,
      );
      TestValidator.equals(
        "when rows empty, totalOrderItems should be zero",
        summary.totalOrderItems,
        0,
      );
      TestValidator.equals(
        "when rows empty, totalGrossMerchandiseValue should be zero",
        summary.totalGrossMerchandiseValue,
        0,
      );
    }
  }
}
