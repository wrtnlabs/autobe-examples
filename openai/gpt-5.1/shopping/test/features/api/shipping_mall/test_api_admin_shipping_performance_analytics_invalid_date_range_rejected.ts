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
 * Ensure admin shipping performance analytics rejects an invalid date range.
 *
 * Business goal:
 *
 * - Confirm that the shipping performance analytics endpoint enforces business
 *   validation on the time range window and does not accept a request where
 *   `from` is later than `to`.
 * - Verify this in the context of a properly authenticated admin so that the only
 *   reason for failure is the invalid business input, not missing
 *   authentication.
 *
 * Test workflow:
 *
 * 1. Register an admin using POST /auth/admin/join to obtain an authenticated
 *    admin session.
 * 2. Construct an IShoppingMallShippingPerformanceAnalytics.IRequest body with:
 *
 *    - `from` and `to` as ISO 8601 date-time strings where `from` is after `to`
 *         (e.g., from = 2025-01-10T00:00:00Z, to = 2025-01-01T00:00:00Z).
 *    - `granularity` set to a valid value such as "day".
 *    - `groupBy` containing a realistic grouping value such as ["shippingMethod"].
 *    - `page` and `limit` set to positive int32 values (e.g., 1 and 20).
 *    - Optional filters (sellerId, countryCode, etc.) omitted so they do not affect
 *         the validation scenario.
 * 3. Call PATCH /shoppingMall/admin/analytics/shippingPerformance using
 *    api.functional.shoppingMall.admin.analytics.shippingPerformance.index with
 *    that body.
 * 4. Expect the call to fail with a business validation error because the date
 *    range is invalid (from > to). Use TestValidator.error with an async
 *    closure around the analytics call to assert that an error is thrown; do
 *    not assert a particular HTTP status code or payload shape.
 * 5. Do not attempt to inspect or type-check the error payload—just validate that
 *    the normal success path (returning a
 *    IPageIShoppingMallShippingPerformanceAnalytics.ISummary page) does not
 *    occur for this invalid date range input.
 */
export async function test_api_admin_shipping_performance_analytics_invalid_date_range_rejected(
  connection: api.IConnection,
) {
  // 1. Register an admin to ensure we test only business validation, not auth.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Build an invalid date range where `from` is after `to`.
  const to = new Date("2025-01-01T00:00:00.000Z");
  const from = new Date("2025-01-10T00:00:00.000Z");

  const invalidRequest = {
    from: from.toISOString(),
    to: to.toISOString(),
    granularity: "day",
    groupBy: ["shippingMethod"],
    page: 1,
    limit: 20,
  } satisfies IShoppingMallShippingPerformanceAnalytics.IRequest;

  // 3–4. Call analytics endpoint and assert that it fails due to invalid range.
  await TestValidator.error(
    "shipping performance analytics rejects from > to date range",
    async () => {
      await api.functional.shoppingMall.admin.analytics.shippingPerformance.index(
        connection,
        {
          body: invalidRequest,
        },
      );
    },
  );
}
