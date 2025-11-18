import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingPerformanceAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingPerformanceAnalytics";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallShippingPerformanceAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPerformanceAnalytics";

/**
 * Validate shipping performance analytics filtering by seller and region.
 *
 * Business purpose
 *
 * - Ensure that an authenticated admin can query shipping performance analytics
 *   with combined filters on seller, region, and shipping method.
 * - Confirm pagination behavior and that grouping and metric fields remain stable
 *   under filtering.
 *
 * Steps
 *
 * 1. Register a new admin using POST /auth/admin/join. This will also attach the
 *    access token to the provided connection via the generated SDK behavior,
 *    enabling subsequent authenticated calls.
 * 2. Build a 30-day analytics request body using
 *    IShoppingMallShippingPerformanceAnalytics.IRequest:
 *
 *    - From: now minus 30 days, as ISO date-time string
 *    - To: now, as ISO date-time string
 *    - Granularity: "day"
 *    - GroupBy: ["shippingMethod", "region"] (values are unconstrained strings in
 *         the DTO, so we can use these literal labels to represent the intended
 *         grouping semantics)
 *    - SellerId: an arbitrary UUID-like string to exercise the filter field
 *    - CountryCode: e.g. "KR"
 *    - RegionCode: e.g. "SEOUL"
 *    - ShippingMethodCode: e.g. "express"
 *    - Page: 1
 *    - Limit: 50
 * 3. Call PATCH /shoppingMall/admin/analytics/shippingPerformance via
 *    api.functional.shoppingMall.admin.analytics.shippingPerformance.index with
 *    the constructed body.
 * 4. Assert basic response validity:
 *
 *    - Typia.assert on the response
 *    - Pagination.limit equals 50
 * 5. If the response contains any rows:
 *
 *    - For each row, verify:
 *
 *         - Shipping_method_code equals the requested shippingMethodCode.
 *         - Stats_date is within [from, to] range (inclusive), by comparing Date objects.
 *         - Median_fulfillment_time_hours is a finite number.
 *         - Median_transit_time_hours is a finite number.
 *         - On_time_delivery_rate is a finite number.
 * 6. Perform a second, more restrictive query intended to return an empty dataset:
 *
 *    - Use the same filters but move the from/to window far into the future (e.g.
 *         from now + 365 days to now + 366 days).
 *    - Call the analytics endpoint again.
 *    - Assert via typia.assert that the response matches
 *         IPageIShoppingMallShippingPerformanceAnalytics.ISummary.
 *    - Assert that:
 *
 *         - Pagination.records === 0
 *         - Pagination.pages === 0
 *         - Data.length === 0
 */
export async function test_api_admin_shipping_performance_analytics_filtered_by_seller_and_region(
  connection: api.IConnection,
) {
  // 1. Register a new admin (auth join)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Build a 30-day analytics request body
  const now = new Date();
  const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const toDate = now;

  const sellerIdFilter: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const countryCodeFilter = "KR";
  const regionCodeFilter = "SEOUL";
  const shippingMethodCodeFilter = "express";

  const mainRequestBody = {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    granularity: "day",
    groupBy: ["shippingMethod", "region"],
    sellerId: sellerIdFilter,
    countryCode: countryCodeFilter,
    regionCode: regionCodeFilter,
    shippingMethodCode: shippingMethodCodeFilter,
    page: 1,
    limit: 50,
  } satisfies IShoppingMallShippingPerformanceAnalytics.IRequest;

  // 3. Call analytics endpoint
  const mainPage: IPageIShoppingMallShippingPerformanceAnalytics.ISummary =
    await api.functional.shoppingMall.admin.analytics.shippingPerformance.index(
      connection,
      { body: mainRequestBody },
    );
  typia.assert(mainPage);

  // 4. Assert pagination limit
  TestValidator.equals(
    "pagination limit should match requested limit",
    mainPage.pagination.limit,
    mainRequestBody.limit,
  );

  // 5. Validate rows when present
  if (mainPage.data.length > 0) {
    for (const row of mainPage.data) {
      // shipping method filter
      TestValidator.equals(
        "row.shipping_method_code must match requested shippingMethodCode",
        row.shipping_method_code,
        shippingMethodCodeFilter,
      );

      // stats_date within [from, to]
      const statsDate = new Date(row.stats_date);
      TestValidator.predicate(
        "stats_date must be >= requested from and <= requested to",
        statsDate.getTime() >= fromDate.getTime() &&
          statsDate.getTime() <= toDate.getTime(),
      );

      // metric fields should be finite numbers
      TestValidator.predicate(
        "median_fulfillment_time_hours must be a finite number",
        Number.isFinite(row.median_fulfillment_time_hours),
      );
      TestValidator.predicate(
        "median_transit_time_hours must be a finite number",
        Number.isFinite(row.median_transit_time_hours),
      );
      TestValidator.predicate(
        "on_time_delivery_rate must be a finite number",
        Number.isFinite(row.on_time_delivery_rate),
      );
    }
  }

  // 6. Second query with future date range intended to yield empty data
  const futureFrom = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const futureTo = new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000);

  const futureRequestBody = {
    from: futureFrom.toISOString(),
    to: futureTo.toISOString(),
    granularity: "day",
    groupBy: ["shippingMethod", "region"],
    sellerId: sellerIdFilter,
    countryCode: countryCodeFilter,
    regionCode: regionCodeFilter,
    shippingMethodCode: shippingMethodCodeFilter,
    page: 1,
    limit: 50,
  } satisfies IShoppingMallShippingPerformanceAnalytics.IRequest;

  const futurePage: IPageIShoppingMallShippingPerformanceAnalytics.ISummary =
    await api.functional.shoppingMall.admin.analytics.shippingPerformance.index(
      connection,
      { body: futureRequestBody },
    );
  typia.assert(futurePage);

  TestValidator.equals(
    "future query should return zero records",
    futurePage.pagination.records,
    0,
  );
  TestValidator.equals(
    "future query should return zero pages",
    futurePage.pagination.pages,
    0,
  );
  TestValidator.equals(
    "future query data array should be empty",
    futurePage.data.length,
    0,
  );
}
