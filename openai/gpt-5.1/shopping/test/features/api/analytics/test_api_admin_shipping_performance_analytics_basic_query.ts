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

export async function test_api_admin_shipping_performance_analytics_basic_query(
  connection: api.IConnection,
) {
  // 1. Register a new admin (establish admin auth context)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // optional ip is omitted to let backend derive it
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Build a 7-day window [from, to]
  const now = new Date();
  const to = now.toISOString();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - sevenDaysMs);
  const from = fromDate.toISOString();

  const requestBody = {
    from,
    to,
    granularity: "day",
    groupBy: ["shippingMethod"],
    sellerId: null,
    countryCode: null,
    regionCode: null,
    shippingMethodCode: null,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallShippingPerformanceAnalytics.IRequest;

  // 3. Call analytics endpoint
  const page: IPageIShoppingMallShippingPerformanceAnalytics.ISummary =
    await api.functional.shoppingMall.admin.analytics.shippingPerformance.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallShippingPerformanceAnalytics.ISummary>(page);

  const pagination = page.pagination;

  // 4. Basic pagination validations
  TestValidator.predicate(
    "pagination current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive or zero",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );

  // When there are records, pages should be at least 1
  if (pagination.records > 0) {
    TestValidator.predicate(
      "pages is at least 1 when records > 0",
      pagination.pages >= 1,
    );
    // current is 1-based in IPage.IPagination (but type allows 0),
    // ensure current >= 1 in this scenario.
    TestValidator.predicate(
      "current page is at least 1 when records > 0",
      pagination.current >= 1,
    );
  }

  // 5. Per-row analytic validations (if any data rows exist)
  for (const row of page.data) {
    // stats_date within [from, to]
    const statsDate = new Date(row.stats_date).getTime();
    const fromTime = new Date(from).getTime();
    const toTime = new Date(to).getTime();

    TestValidator.predicate(
      "stats_date is within requested range",
      statsDate >= fromTime && statsDate <= toTime,
    );

    // shipping_method_code should be non-empty string
    TestValidator.predicate(
      "shipping_method_code is non-empty",
      row.shipping_method_code.length > 0,
    );

    // If shipping_method is present, confirm method_code consistency
    if (row.shipping_method !== undefined) {
      const shippingMethod: IShoppingMallShippingMethod.ISummary =
        row.shipping_method;
      TestValidator.equals(
        "shipping method code matches summary.method_code",
        row.shipping_method_code,
        shippingMethod.method_code,
      );
    }

    // Non-negative counts
    TestValidator.predicate(
      "shipment_created_count is non-negative",
      row.shipment_created_count >= 0,
    );
    TestValidator.predicate(
      "shipment_shipped_count is non-negative",
      row.shipment_shipped_count >= 0,
    );
    TestValidator.predicate(
      "shipment_delivered_count is non-negative",
      row.shipment_delivered_count >= 0,
    );
    TestValidator.predicate(
      "shipment_delivery_failed_count is non-negative",
      row.shipment_delivery_failed_count >= 0,
    );
    TestValidator.predicate(
      "shipment_returned_count is non-negative",
      row.shipment_returned_count >= 0,
    );

    // Non-negative median times
    TestValidator.predicate(
      "median_fulfillment_time_hours is non-negative",
      row.median_fulfillment_time_hours >= 0,
    );
    TestValidator.predicate(
      "median_transit_time_hours is non-negative",
      row.median_transit_time_hours >= 0,
    );

    // on_time_delivery_rate between 0 and 1 inclusive
    TestValidator.predicate(
      "on_time_delivery_rate between 0 and 1",
      row.on_time_delivery_rate >= 0 && row.on_time_delivery_rate <= 1,
    );
  }
}
