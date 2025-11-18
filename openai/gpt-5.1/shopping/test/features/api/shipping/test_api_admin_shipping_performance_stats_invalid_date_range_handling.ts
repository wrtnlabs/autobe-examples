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
 * Validate handling of inverted date ranges in admin shipping performance
 * analytics.
 *
 * Business purpose: Ensure that the admin analytics endpoint for shipping
 * performance statistics behaves safely and predictably when given a logically
 * inconsistent date range where `dateFrom` is after `dateTo`. The expectation
 * (for this implementation) is that the analytics layer normalizes the request
 * into an empty result set instead of crashing or returning malformed data.
 *
 * Test flow:
 *
 * 1. Join an admin account via POST /auth/admin/join to obtain an authenticated
 *    admin session. The SDK call automatically sets the Authorization header on
 *    the provided connection instance.
 * 2. Call PATCH /shoppingMall/admin/analytics/shippingPerformanceStats with a
 *    request body where `dateFrom` is later than `dateTo`, using otherwise
 *    valid pagination and sorting parameters.
 * 3. Verify that the call succeeds and returns a structurally valid page of
 *    IShoppingMallShippingPerformanceStat.ISummary records.
 * 4. Assert business behavior for the inverted range scenario:
 *
 *    - The returned `data` array is empty.
 *    - The `pagination.records` count is zero.
 *    - The `pagination.pages` count is either 0 or 1, depending on platform
 *         convention, but in any case remains logically consistent with zero
 *         records.
 */
export async function test_api_admin_shipping_performance_stats_invalid_date_range_handling(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication setup)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare an inverted date range for the analytics request
  const laterDate = "2025-01-10T00:00:00.000Z" as string &
    tags.Format<"date-time">;
  const earlierDate = "2025-01-01T00:00:00.000Z" as string &
    tags.Format<"date-time">;

  const requestBody = {
    dateFrom: laterDate,
    dateTo: earlierDate,
    // Leave shippingMethodCodes undefined to avoid filtering by method.
    shippingMethodCodes: undefined,
    // Explicitly set thresholds to null to indicate no KPI threshold filters.
    minOnTimeDeliveryRate: null,
    maxOnTimeDeliveryRate: null,
    minMedianTransitTimeHours: null,
    maxMedianTransitTimeHours: null,
    sortBy: "stats_date",
    sortDirection: "asc",
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
  } satisfies IShoppingMallShippingPerformanceStat.IRequest;

  // 3. Call the shipping performance statistics analytics endpoint
  const page: IPageIShoppingMallShippingPerformanceStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.shippingPerformanceStats.index(
      connection,
      {
        body: requestBody,
      },
    );

  // 4. Validate response structure and business behavior
  typia.assert<IPageIShoppingMallShippingPerformanceStat.ISummary>(page);

  // Assert that inverted date range yields an empty dataset.
  TestValidator.equals(
    "inverted date range yields empty data",
    page.data.length,
    0,
  );

  // Assert that pagination records count is zero.
  TestValidator.equals(
    "inverted date range has zero records",
    page.pagination.records,
    0,
  );

  // Assert that pages is either 0 or 1, depending on platform convention.
  TestValidator.predicate(
    "inverted date range has 0 or 1 pages",
    page.pagination.pages === 0 || page.pagination.pages === 1,
  );
}
