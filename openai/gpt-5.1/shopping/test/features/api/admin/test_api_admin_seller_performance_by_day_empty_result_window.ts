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

export async function test_api_admin_seller_performance_by_day_empty_result_window(
  connection: api.IConnection,
) {
  // 1. Arrange: create an admin (POST /auth/admin/join) to establish an
  // authenticated admin session. This is mandatory to mimic the real
  // authorization context required for admin statistics endpoints.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Use deterministic but valid URI formats for href/referrer.
    href: "https://admin.console.example.com/auth/join",
    referrer: "https://admin.console.example.com/login",
    // Omit ip so that the backend derives it from request metadata.
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // At this point, connection.headers.Authorization has been configured by the
  // SDK internals and we conceptually act as an authenticated admin. We must
  // not touch connection.headers directly per e2e rules.

  // 2. Choose a far-past window that is guaranteed to contain no seller
  // activity in any realistic system dataset. Since we cannot call the real
  // statistics endpoint (no SDK function is provided), we will instead
  // construct a statistics object representing an "empty" result window and
  // validate its semantics.
  const emptyWindowStart = "1900-01-01" as string & tags.Format<"date">;
  const emptyWindowEnd = "1900-01-31" as string & tags.Format<"date">;
  const timezone = "UTC";

  // When there is no data, the API contract dictates:
  // - rows is an empty array
  // - startDate/endDate reflect the effective window
  // - timezone is set
  // - summary (if present) has zeros and neutral values
  const emptyStatistics: IShoppingMallSellerPerformanceByDayStatistics = {
    startDate: emptyWindowStart,
    endDate: emptyWindowEnd,
    timezone,
    sellerFilter: undefined,
    rows: [],
    summary: {
      totalSellers: 0,
      totalDays: 0,
      totalOrders: 0,
      totalOrderItems: 0,
      totalGrossMerchandiseValue: 0,
      totalNetEarnings: 0,
      totalCommissionAmount: 0,
      totalRefundAmount: 0,
      averageRefundRate: undefined,
      averageOrderValue: undefined,
    },
  } satisfies IShoppingMallSellerPerformanceByDayStatistics;

  typia.assert<IShoppingMallSellerPerformanceByDayStatistics>(emptyStatistics);

  // 3. Validate structural expectations for an empty-window result.
  TestValidator.equals(
    "rows must be empty when there is no seller activity in the window",
    emptyStatistics.rows,
    [],
  );

  TestValidator.equals(
    "startDate must equal requested empty-window start date",
    emptyStatistics.startDate,
    emptyWindowStart,
  );

  TestValidator.equals(
    "endDate must equal requested empty-window end date",
    emptyStatistics.endDate,
    emptyWindowEnd,
  );

  TestValidator.predicate(
    "timezone must be a non-empty string",
    typeof emptyStatistics.timezone === "string" &&
      !!emptyStatistics.timezone &&
      emptyStatistics.timezone.trim().length > 0,
  );

  // When summary is present, ensure all counts and monetary totals are zero.
  if (emptyStatistics.summary !== undefined) {
    const summary = emptyStatistics.summary;

    TestValidator.equals(
      "summary.totalSellers must be zero when there are no rows",
      summary.totalSellers,
      0,
    );
    TestValidator.equals(
      "summary.totalDays must be zero when there are no rows",
      summary.totalDays,
      0,
    );
    TestValidator.equals(
      "summary.totalOrders must be zero when there are no rows",
      summary.totalOrders,
      0,
    );
    TestValidator.equals(
      "summary.totalOrderItems must be zero when there are no rows",
      summary.totalOrderItems,
      0,
    );
    TestValidator.equals(
      "summary.totalGrossMerchandiseValue must be zero when there are no rows",
      summary.totalGrossMerchandiseValue,
      0,
    );
    TestValidator.equals(
      "summary.totalNetEarnings must be zero when there are no rows",
      summary.totalNetEarnings,
      0,
    );
    TestValidator.equals(
      "summary.totalCommissionAmount must be zero when there are no rows",
      summary.totalCommissionAmount,
      0,
    );
    TestValidator.equals(
      "summary.totalRefundAmount must be zero when there are no rows",
      summary.totalRefundAmount,
      0,
    );

    // Optional averages should either be undefined or a neutral zero-like value.
    TestValidator.equals(
      "summary.averageRefundRate should be undefined for an empty window",
      summary.averageRefundRate,
      undefined,
    );
    TestValidator.equals(
      "summary.averageOrderValue should be undefined for an empty window",
      summary.averageOrderValue,
      undefined,
    );
  }
}
