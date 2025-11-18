import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderDailyStat";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallOrderDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDailyStat";

/**
 * Validate that the admin daily order statistics analytics endpoint rejects an
 * invalid date range where fromDate is after toDate.
 *
 * Business context
 *
 * - Admins query /shoppingMall/admin/analytics/orderDailyStats with
 *   IShoppingMallOrderDailyStat.IRequest to retrieve paginated daily order KPI
 *   snapshots over a date range.
 * - The backend should enforce that fromDate <= toDate when both are provided; an
 *   inverted range is a business validation error and must not return a normal
 *   IPageIShoppingMallOrderDailyStat.ISummary page.
 *
 * Test workflow
 *
 * 1. Register an admin via POST /auth/admin/join using
 *    IShoppingMallAdminJoin.ICreate and rely on the SDK to attach the access
 *    token into connection.headers for subsequent calls.
 * 2. Build an IShoppingMallOrderDailyStat.IRequest body where:
 *
 *    - FromDate is later than toDate (e.g., 2025-01-10T00:00:00.000Z as lower bound
 *         and 2025-01-01T00:00:00.000Z as upper bound).
 *    - Page and limit are valid positive integers.
 *    - SortBy and sortDirection are omitted.
 * 3. Call api.functional.shoppingMall.admin.analytics.orderDailyStats.index inside
 *    TestValidator.error to assert that it throws instead of returning an
 *    IPageIShoppingMallOrderDailyStat.ISummary payload.
 * 4. Do not assert HTTP status codes or parse error bodies; simply rely on the
 *    fact that an error is raised for invalid business input.
 */
export async function test_api_admin_order_daily_stats_invalid_date_range(
  connection: api.IConnection,
) {
  // 1. Register an admin and ensure authorization context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare an invalid date range where fromDate is after toDate
  const fromDate: string & tags.Format<"date-time"> = new Date(
    "2025-01-10T00:00:00.000Z",
  ).toISOString() as string & tags.Format<"date-time">;
  const toDate: string & tags.Format<"date-time"> = new Date(
    "2025-01-01T00:00:00.000Z",
  ).toISOString() as string & tags.Format<"date-time">;

  // Sanity check that fromDate is actually later than toDate in JS
  TestValidator.predicate("fromDate must be later than toDate", () => {
    const fromMs = new Date(fromDate).getTime();
    const toMs = new Date(toDate).getTime();
    return fromMs > toMs;
  });

  const invalidRequestBody = {
    fromDate,
    toDate,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallOrderDailyStat.IRequest;

  // 3. Assert the analytics endpoint rejects the invalid date range
  await TestValidator.error(
    "orderDailyStats index must fail on invalid date range (fromDate > toDate)",
    async () => {
      const _unused: IPageIShoppingMallOrderDailyStat.ISummary =
        await api.functional.shoppingMall.admin.analytics.orderDailyStats.index(
          connection,
          {
            body: invalidRequestBody,
          },
        );

      // If the call unexpectedly succeeds, enforce type correctness and
      // fail the test explicitly to guard against silent success.
      typia.assert<IPageIShoppingMallOrderDailyStat.ISummary>(_unused);
      throw new Error(
        "Expected orderDailyStats.index to reject invalid date range but it succeeded.",
      );
    },
  );
}
