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
 * Validate default pagination and sorting behavior of admin daily order stats
 * analytics.
 *
 * Business intent:
 *
 * - Ensure that when an admin queries daily order statistics with only a date
 *   range (fromDate/toDate) and omits pagination and sorting controls, the
 *   backend applies stable, sensible defaults.
 * - Defaults are expected to be: first page (current = 1), a configured default
 *   page size (limit > 0), and ordering by stats_date in descending order so
 *   that most recent days appear first.
 * - The endpoint must still respect the provided date range filter.
 *
 * Scenario steps:
 *
 * 1. Join a new admin using POST /auth/admin/join to obtain an authenticated
 *    context.
 * 2. Define a reasonable analytics date window (e.g., last 30 days) and construct
 *    an IShoppingMallOrderDailyStat.IRequest with only fromDate and toDate set,
 *    omitting page, limit, sortBy, and sortDirection.
 * 3. Call PATCH /shoppingMall/admin/analytics/orderDailyStats via
 *    api.functional.shoppingMall.admin.analytics.orderDailyStats.index with
 *    that minimal request body.
 * 4. Assert that the response matches IPageIShoppingMallOrderDailyStat.ISummary
 *    via typia.assert and inspect its pagination and data fields.
 * 5. Verify that pagination.current equals 1 and pagination.limit is a positive
 *    integer (the concrete default size is not specified, but it must be > 0).
 * 6. If there is at least one record, validate that:
 *
 *    - Stats_date of each record is within [fromDate, toDate] inclusive.
 *    - The stats_date values are monotonically ordered according to the default
 *         sorting, assumed to be descending (each previous stats_date >= next
 *         stats_date).
 * 7. Perform a second call to the same endpoint, this time explicitly setting
 *    sortBy = "stats_date" and sortDirection = "desc" along with the same
 *    fromDate and toDate, plus the same page = 1 and the same limit as observed
 *    from the default response, to confirm equivalence of ordering and
 *    content.
 * 8. Compare the two result sets (default vs explicit sorting) using TestValidator
 *    to ensure that data arrays are deeply equal when the same pagination
 *    window is applied.
 */
export async function test_api_admin_order_daily_stats_default_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Join a new admin to obtain authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // 2. Build a date range window (last 30 days).
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const fromDateObj = new Date(now.getTime() - thirtyDaysMs);
  const toDateObj = now;

  const fromDateIso = fromDateObj.toISOString() as string &
    tags.Format<"date-time">;
  const toDateIso = toDateObj.toISOString() as string &
    tags.Format<"date-time">;

  const defaultRequestBody = {
    fromDate: fromDateIso,
    toDate: toDateIso,
  } satisfies IShoppingMallOrderDailyStat.IRequest;

  // 3. Call analytics endpoint with only fromDate/toDate (default pagination & sorting).
  const defaultPage: IPageIShoppingMallOrderDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.orderDailyStats.index(
      connection,
      { body: defaultRequestBody },
    );
  typia.assert(defaultPage);

  const defaultPagination = defaultPage.pagination;
  const defaultData = defaultPage.data;

  // 4. Verify pagination defaults.
  TestValidator.equals(
    "default current page should be 1",
    defaultPagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.predicate(
    "default page size (limit) should be positive",
    defaultPagination.limit > 0,
  );

  // 5. If there are records, verify date range and default ordering.
  if (defaultData.length > 0) {
    for (const stat of defaultData) {
      const statsDate = new Date(stat.stats_date);
      TestValidator.predicate(
        "stats_date should be on or after fromDate",
        statsDate.getTime() >= fromDateObj.getTime(),
      );
      TestValidator.predicate(
        "stats_date should be on or before toDate",
        statsDate.getTime() <= toDateObj.getTime(),
      );
    }

    for (let i = 1; i < defaultData.length; i++) {
      const prev = new Date(defaultData[i - 1].stats_date);
      const curr = new Date(defaultData[i].stats_date);
      TestValidator.predicate(
        "default ordering should be descending by stats_date",
        prev.getTime() >= curr.getTime(),
      );
    }
  }

  // 6. Second call with explicit sorting & pagination to confirm equivalence.
  const explicitRequestBody = {
    fromDate: fromDateIso,
    toDate: toDateIso,
    page: defaultPagination.current,
    limit: defaultPagination.limit,
    sortBy: "stats_date",
    sortDirection: "desc",
  } satisfies IShoppingMallOrderDailyStat.IRequest;

  const explicitPage: IPageIShoppingMallOrderDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.orderDailyStats.index(
      connection,
      { body: explicitRequestBody },
    );
  typia.assert(explicitPage);

  // 7. Compare pagination and data between default and explicitly sorted responses.
  TestValidator.equals(
    "explicit pagination should match default pagination",
    explicitPage.pagination,
    defaultPagination,
  );
  TestValidator.equals(
    "explicitly sorted data should equal default data",
    explicitPage.data,
    defaultData,
  );
}
