import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerDailyStat";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDailyStat";

/**
 * Validate admin seller daily stats filtering by seller and GMV range.
 *
 * Business goal: Ensure an authenticated admin can query seller daily
 * statistics snapshots filtered by a specific seller and GMV (gross merchandise
 * value) range, and that the backend enforces all filter and sorting
 * constraints consistently with the contract of
 * IShoppingMallSellerDailyStat.IRequest and
 * IPageIShoppingMallSellerDailyStat.ISummary.
 *
 * High level flow:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context. The SDK automatically wires the access token into the connection
 *    headers, so subsequent calls run as this admin.
 * 2. Build a focused analytics query body (IShoppingMallSellerDailyStat.IRequest)
 *    that targets:
 *
 *    - A concrete sellerId that has existing daily stats in seed data
 *    - A fromDate/toDate window
 *    - A minGmvAmount/maxGmvAmount range to constrain GMV
 *    - SortBy = "gmv_amount", sortDirection = "asc"
 * 3. Invoke PATCH /shoppingMall/admin/analytics/sellerDailyStats through
 *    api.functional.shoppingMall.admin.analytics.sellerDailyStats.index.
 * 4. Assert the response type and shape using typia.assert, then perform
 *    business-level validations:
 *
 *    - Every row belongs to the requested seller
 *    - Every row's gmv_amount is within [minGmvAmount, maxGmvAmount]
 *    - Every row's stats_date is within [fromDate, toDate]
 *    - Rows are globally sorted by gmv_amount ascending
 *    - Pagination metadata is internally consistent.
 *
 * Assumptions:
 *
 * - Integration or E2E environment is pre-populated with at least one seller that
 *   has multiple seller-daily-stat snapshot rows across several days.
 * - We do not know any concrete sellerId ahead of time, so the test first issues
 *   an unfiltered analytics call to discover an appropriate seller and GMV
 *   range, then repeats the query with narrowed filters.
 */
export async function test_api_admin_seller_daily_stats_filter_by_seller_and_gmv_range(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Initial broad search to discover a seller and GMV range.
  const initialRequestBody = {
    // rely on backend defaults for page/limit and sort when omitted
  } satisfies IShoppingMallSellerDailyStat.IRequest;

  const initialPage =
    await api.functional.shoppingMall.admin.analytics.sellerDailyStats.index(
      connection,
      { body: initialRequestBody },
    );
  typia.assert<IPageIShoppingMallSellerDailyStat.ISummary>(initialPage);

  const pagination: IPage.IPagination = initialPage.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // If there is no data at all, the environment does not have seller daily
  // stats. In that case, just assert basic pagination invariants and finish.
  if (initialPage.data.length === 0) {
    await TestValidator.predicate(
      "empty dataset implies zero records",
      () => pagination.records === 0 && pagination.pages === 0,
    );
    return;
  }

  // 3. Pick a seller and GMV bounds from the initial page.
  const sampleStat: IShoppingMallSellerDailyStat.ISummary = initialPage.data[0];
  typia.assert<IShoppingMallSellerDailyStat.ISummary>(sampleStat);

  const sellerSummary: IShoppingMallSeller.ISummary = sampleStat.seller;
  typia.assert<IShoppingMallSeller.ISummary>(sellerSummary);

  const sellerId = sellerSummary.id;

  // Compute GMV min/max around the example stat to ensure at least one match.
  const baseGmv = sampleStat.gmv_amount;
  const minGmvAmount = baseGmv * 0.5;
  const maxGmvAmount = baseGmv * 1.5;

  // Define a date window around the sample stats_date.
  const statsDate = new Date(sampleStat.stats_date);
  const oneDayMs = 24 * 60 * 60 * 1000;
  const fromDate = new Date(statsDate.getTime() - oneDayMs).toISOString();
  const toDate = new Date(statsDate.getTime() + oneDayMs).toISOString();

  // 4. Execute a focused filtered search.
  const filteredRequestBody = {
    sellerId,
    fromDate,
    toDate,
    minGmvAmount,
    maxGmvAmount,
    sortBy: "gmv_amount",
    sortDirection: "asc" as const,
  } satisfies IShoppingMallSellerDailyStat.IRequest;

  const filteredPage =
    await api.functional.shoppingMall.admin.analytics.sellerDailyStats.index(
      connection,
      { body: filteredRequestBody },
    );
  typia.assert<IPageIShoppingMallSellerDailyStat.ISummary>(filteredPage);

  const filteredPagination: IPage.IPagination = filteredPage.pagination;
  typia.assert<IPage.IPagination>(filteredPagination);

  // 5. Validate each returned row respects all filter constraints.
  const summaries = filteredPage.data;

  // 5.1 All records belong to the requested seller and match GMV range & date.
  for (const stat of summaries) {
    typia.assert<IShoppingMallSellerDailyStat.ISummary>(stat);

    await TestValidator.equals(
      "stat.seller.id matches requested sellerId",
      stat.seller.id,
      sellerId,
    );

    await TestValidator.predicate(
      "gmv_amount within requested range",
      () => stat.gmv_amount >= minGmvAmount && stat.gmv_amount <= maxGmvAmount,
    );

    const statDate = new Date(stat.stats_date).getTime();
    const fromTime = new Date(fromDate).getTime();
    const toTime = new Date(toDate).getTime();

    await TestValidator.predicate(
      "stats_date within requested date window",
      () => statDate >= fromTime && statDate <= toTime,
    );
  }

  // 6. Assert that the list is sorted by gmv_amount ascending.
  if (summaries.length > 1) {
    for (let i = 1; i < summaries.length; i++) {
      const prev = summaries[i - 1];
      const curr = summaries[i];
      await TestValidator.predicate(
        "gmv_amount is non-decreasing across summaries",
        () => prev.gmv_amount <= curr.gmv_amount,
      );
    }
  }

  // 7. Basic pagination invariants when records exist.
  if (summaries.length > 0) {
    await TestValidator.predicate(
      "pagination.records is positive when data exists",
      () => filteredPagination.records > 0,
    );

    await TestValidator.predicate(
      "pagination.pages is at least one when data exists",
      () => filteredPagination.pages >= 1,
    );
  }
}
