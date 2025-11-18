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
 * Validate admin daily order statistics search over a basic date range.
 *
 * ## Business goal
 *
 * Ensure that an authenticated shopping mall administrator can search paginated
 * daily order statistics snapshots over a simple date range using PATCH
 * /shoppingMall/admin/analytics/orderDailyStats, and that the response
 * structure, pagination metadata, date filtering, and sort ordering behave as
 * expected.
 *
 * ## High level steps
 *
 * 1. Register a new admin via POST /auth/admin/join and rely on the SDK's
 *    automatic token handling to authenticate subsequent calls.
 * 2. Build a short date range window (e.g., last 7 days) and construct an
 *    IShoppingMallOrderDailyStat.IRequest body including:
 *
 *    - FromDate, toDate
 *    - Page = 1, limit = 20
 *    - SortBy = "stats_date", sortDirection = "desc".
 * 3. Call PATCH /shoppingMall/admin/analytics/orderDailyStats.
 * 4. Validate that:
 *
 *    - The response conforms to IPageIShoppingMallOrderDailyStat.ISummary.
 *    - Pagination.current and pagination.limit match the requested page/limit.
 *    - Pagination.records and pagination.pages are non-negative.
 *    - If any data rows are returned:
 *
 *         - Each element conforms to IShoppingMallOrderDailyStat.ISummary.
 *         - Stats_date for each row lies within the requested [fromDate, toDate] window.
 *         - The data is ordered in descending stats_date.
 *
 * ## Notes
 *
 * - We never touch connection.headers directly; auth is done only via
 *   api.functional.auth.admin.join.
 * - We never assert HTTP status codes; successful Promise resolution implies
 *   success, and typia.assert provides runtime type guarantees.
 */
export async function test_api_admin_order_daily_stats_search_basic_date_range(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Build a basic date range request for the last 7 days
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const fromDateObj = new Date(now.getTime() - sevenDaysMs);
  const toDateObj = now;

  const fromDateIso = fromDateObj.toISOString();
  const toDateIso = toDateObj.toISOString();

  const page = 1 as number;
  const limit = 20 as number;

  const requestBody = {
    fromDate: fromDateIso as string & tags.Format<"date-time">,
    toDate: toDateIso as string & tags.Format<"date-time">,
    page,
    limit,
    sortBy: "stats_date",
    sortDirection: "desc",
  } satisfies IShoppingMallOrderDailyStat.IRequest;

  // 3. Call analytics daily stats index API
  const pageResult: IPageIShoppingMallOrderDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.orderDailyStats.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallOrderDailyStat.ISummary>(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  const data: IShoppingMallOrderDailyStat.ISummary[] = pageResult.data;

  // 4. Basic pagination assertions
  TestValidator.equals(
    "pagination current page should match requested page",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );

  // When there are zero records, data array should be empty.
  if (pagination.records === 0) {
    TestValidator.equals(
      "data should be empty when records is zero",
      data.length,
      0,
    );
    return;
  }

  // When there are records, data length must be > 0 and <= limit.
  TestValidator.predicate(
    "data length should be positive when records > 0",
    data.length > 0,
  );
  TestValidator.predicate(
    "data length should not exceed requested limit",
    data.length <= limit,
  );

  // 5. Per-element type assertion and date range validation
  const fromMillis = fromDateObj.getTime();
  const toMillis = toDateObj.getTime();

  for (const row of data) {
    // Validate structure strictly
    typia.assert<IShoppingMallOrderDailyStat.ISummary>(row);

    const statsDateMillis = new Date(row.stats_date).getTime();

    TestValidator.predicate(
      "stats_date should be within requested date range",
      statsDateMillis >= fromMillis && statsDateMillis <= toMillis,
    );
  }

  // 6. Verify descending ordering by stats_date
  for (let i = 1; i < data.length; ++i) {
    const prev = data[i - 1];
    const curr = data[i];

    const prevMillis = new Date(prev.stats_date).getTime();
    const currMillis = new Date(curr.stats_date).getTime();

    TestValidator.predicate(
      "stats_date should be sorted in descending order",
      prevMillis >= currMillis,
    );
  }
}
