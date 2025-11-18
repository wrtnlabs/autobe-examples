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
 * Validate KPI threshold filters and sorting behavior in admin shipping
 * performance stats.
 *
 * Business goal: Ensure that an authenticated admin can query shipping
 * performance statistics with KPI-based threshold filters (on-time delivery
 * rate and median transit time) and that the backend correctly constrains
 * results and sorts them by on_time_delivery_rate in ascending order, so that
 * underperforming shipping methods appear first.
 *
 * End-to-end steps:
 *
 * 1. Admin registration & implicit login via POST /auth/admin/join.
 * 2. Build a 30-day date window [now-30d, now] and KPI thresholds:
 *
 *    - MinOnTimeDeliveryRate = null (no minimum)
 *    - MaxOnTimeDeliveryRate = 0.8 (focus on poor performers)
 *    - Set median transit time bounds (e.g., 0-100 hours).
 *    - SortBy = "on_time_delivery_rate", sortDirection = "asc".
 *    - Page & limit configured for a single result page.
 * 3. Call PATCH /shoppingMall/admin/analytics/shippingPerformanceStats.
 * 4. Assert response type (IPageIShoppingMallShippingPerformanceStat.ISummary).
 * 5. For each row in data:
 *
 *    - Verify on_time_delivery_rate <= requested max.
 *    - Verify median_transit_time_hours respects configured bounds.
 * 6. Verify that rows are sorted ascending by on_time_delivery_rate and that
 *    first.on_time_delivery_rate <= last.on_time_delivery_rate when at least
 *    two rows exist.
 * 7. Sanity check pagination metadata for non-negative values and internal
 *    consistency.
 */
export async function test_api_admin_shipping_performance_stats_threshold_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join to obtain authorized admin context and token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Build KPI threshold request for shipping performance stats
  const now = new Date();
  const millisPerDay = 24 * 60 * 60 * 1000;
  const from = new Date(now.getTime() - 30 * millisPerDay);
  const dateFrom = from.toISOString();
  const dateTo = now.toISOString();

  const maxOnTime = 0.8;
  const minMedianTransit = 0;
  const maxMedianTransit = 100;

  const requestBody = {
    dateFrom,
    dateTo,
    // No explicit shipping method filter to allow broader stats coverage
    shippingMethodCodes: undefined,
    // Scenario: no lower bound, focus on methods up to a maximum on-time rate
    minOnTimeDeliveryRate: null,
    maxOnTimeDeliveryRate: maxOnTime,
    // Median transit time window to ensure we only see realistic ranges
    minMedianTransitTimeHours: minMedianTransit,
    maxMedianTransitTimeHours: maxMedianTransit,
    sortBy: "on_time_delivery_rate",
    sortDirection: "asc",
    page: 1,
    limit: 50,
  } satisfies IShoppingMallShippingPerformanceStat.IRequest;

  const page =
    await api.functional.shoppingMall.admin.analytics.shippingPerformanceStats.index(
      connection,
      {
        body: requestBody,
      },
    );

  typia.assert<IPageIShoppingMallShippingPerformanceStat.ISummary>(page);

  const pagination: IPage.IPagination = page.pagination;
  const data: IShoppingMallShippingPerformanceStat.ISummary[] = page.data;

  // 3. Basic pagination sanity checks
  TestValidator.predicate(
    "pagination current page is non-negative",
    () => pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    () => pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination records should be at least the number of data items",
    () => pagination.records >= data.length,
  );

  // 4. Per-row KPI threshold validations
  for (const stat of data) {
    typia.assert<IShoppingMallShippingPerformanceStat.ISummary>(stat);

    TestValidator.predicate(
      "on_time_delivery_rate must be less than or equal to requested maxOnTimeDeliveryRate",
      () => stat.on_time_delivery_rate <= maxOnTime,
    );

    TestValidator.predicate(
      "median_transit_time_hours must be greater than or equal to minMedianTransitTimeHours",
      () => stat.median_transit_time_hours >= minMedianTransit,
    );

    TestValidator.predicate(
      "median_transit_time_hours must be less than or equal to maxMedianTransitTimeHours",
      () => stat.median_transit_time_hours <= maxMedianTransit,
    );
  }

  // 5. Sorting validation: ensure ascending order by on_time_delivery_rate
  for (let i = 1; i < data.length; ++i) {
    const prev = data[i - 1];
    const curr = data[i];
    TestValidator.predicate(
      "shipping performance stats must be sorted ascending by on_time_delivery_rate",
      () => prev.on_time_delivery_rate <= curr.on_time_delivery_rate,
    );
  }

  if (data.length >= 2) {
    const first = data[0];
    const last = data[data.length - 1];
    TestValidator.predicate(
      "first entry must have on_time_delivery_rate less than or equal to last entry",
      () => first.on_time_delivery_rate <= last.on_time_delivery_rate,
    );
  }
}
