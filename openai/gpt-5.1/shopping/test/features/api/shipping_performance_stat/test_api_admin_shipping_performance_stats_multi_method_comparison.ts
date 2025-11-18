import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingPerformanceStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingPerformanceStat";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingPerformanceStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPerformanceStat";

/**
 * Validate multi-method comparison analytics for shipping performance stats.
 *
 * Business goal: Ensure that an authenticated admin can request shipping
 * performance statistics for multiple shipping methods in a single PATCH
 * analytics request and use the response for comparative dashboards.
 *
 * Steps:
 *
 * 1. Register an admin (POST /auth/admin/join) to obtain an authenticated context;
 *    the SDK will attach the JWT access token to the connection.
 * 2. Build an IShoppingMallShippingPerformanceStat.IRequest body with:
 *
 *    - A recent date range (last 7 days).
 *    - At least two shippingMethodCodes (e.g. "standard", "express").
 *    - Pagination (page=1, limit=50).
 *    - SortBy="shipping_method_code" and sortDirection="asc".
 * 3. Call PATCH /shoppingMall/admin/analytics/shippingPerformanceStats and assert
 *    that the response matches
 *    IPageIShoppingMallShippingPerformanceStat.ISummary.
 * 4. Validate that all returned records:
 *
 *    - Have shipping_method_code included in the requested list.
 *    - Are globally sorted by shipping_method_code ascending.
 *    - Show at least one and at most N distinct shipping_method_code values, where N
 *         is the size of the requested list. If 2+ codes appear, this confirms
 *         multi-method comparison capability.
 * 5. Perform a simple client-side aggregation per shipping_method_code to verify
 *    that shipment_delivered_count and on_time_delivery_rate fields are
 *    suitable for dashboards (non-negative counts, rates within [0,1]).
 */
export async function test_api_admin_shipping_performance_stats_multi_method_comparison(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Build analytics request body for multi-method comparison
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const shippingMethodCodes = ["express", "standard"] as const;

  const page = 1;
  const limit = 50;

  const requestBody = {
    dateFrom: sevenDaysAgo.toISOString(),
    dateTo: now.toISOString(),
    shippingMethodCodes: [...shippingMethodCodes],
    minOnTimeDeliveryRate: undefined,
    maxOnTimeDeliveryRate: undefined,
    minMedianTransitTimeHours: undefined,
    maxMedianTransitTimeHours: undefined,
    sortBy: "shipping_method_code",
    sortDirection: "asc",
    page,
    limit,
  } satisfies IShoppingMallShippingPerformanceStat.IRequest;

  // 3. Call analytics endpoint
  const pageResult =
    await api.functional.shoppingMall.admin.analytics.shippingPerformanceStats.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallShippingPerformanceStat.ISummary>(pageResult);

  // Basic pagination checks
  TestValidator.equals(
    "pagination current page should match requested page",
    page,
    pageResult.pagination.current,
  );
  TestValidator.predicate(
    "pagination limit should not exceed requested limit",
    pageResult.pagination.limit <= limit,
  );

  const data: IShoppingMallShippingPerformanceStat.ISummary[] = pageResult.data;

  // 4. Validate data array if non-empty
  if (data.length > 0) {
    // 4-1. All shipping_method_code values must be in requested list
    for (const item of data) {
      TestValidator.predicate(
        "item shipping_method_code should be in requested shippingMethodCodes",
        shippingMethodCodes.includes(
          item.shipping_method_code as (typeof shippingMethodCodes)[number],
        ),
      );
    }

    // 4-2. Distinct code count within [1, requested size]
    const distinctCodes = Array.from(
      new Set(data.map((d) => d.shipping_method_code)),
    );
    TestValidator.predicate(
      "at least one distinct shipping_method_code present",
      distinctCodes.length >= 1,
    );
    TestValidator.predicate(
      "distinct shipping_method_code count must not exceed requested count",
      distinctCodes.length <= shippingMethodCodes.length,
    );

    // 4-3. Verify global sorting by shipping_method_code asc
    for (let i = 1; i < data.length; ++i) {
      const prev = data[i - 1];
      const curr = data[i];
      TestValidator.predicate(
        "shipping_method_code should be non-decreasing lexicographically",
        prev.shipping_method_code <= curr.shipping_method_code,
      );
    }

    // 5. Optional aggregation per shipping_method_code
    const aggregates = new Map<
      string,
      {
        deliveredSum: number;
        onTimeRateSum: number;
        count: number;
      }
    >();

    for (const item of data) {
      const key = item.shipping_method_code;
      const existing = aggregates.get(key) ?? {
        deliveredSum: 0,
        onTimeRateSum: 0,
        count: 0,
      };
      existing.deliveredSum += item.shipment_delivered_count;
      existing.onTimeRateSum += item.on_time_delivery_rate;
      existing.count += 1;
      aggregates.set(key, existing);
    }

    for (const [code, agg] of aggregates.entries()) {
      TestValidator.predicate(
        `aggregate deliveredSum non-negative for ${code}`,
        agg.deliveredSum >= 0,
      );
      const avgRate = agg.onTimeRateSum / agg.count;
      TestValidator.predicate(
        `average on_time_delivery_rate in [0,1] for ${code}`,
        avgRate >= 0 && avgRate <= 1,
      );
    }
  }
}
