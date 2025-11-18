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

export async function test_api_admin_shipping_performance_analytics_unauthorized_without_token(
  connection: api.IConnection,
) {
  /**
   * Validate that admin shipping performance analytics cannot be accessed
   * without an admin Authorization token.
   *
   * Business flow:
   *
   * 1. Build a syntactically valid analytics request body using
   *    IShoppingMallShippingPerformanceAnalytics.IRequest.
   * 2. Derive an "unauthenticated" connection from the given connection with an
   *    empty headers object to simulate a client that sends no Authorization
   *    header.
   * 3. Call PATCH /shoppingMall/admin/analytics/shippingPerformance with the
   *    unauthenticated connection and expect the call to fail with an
   *    authorization error (without checking the exact HTTP status code).
   * 4. Join as an admin on the original connection using POST /auth/admin/join so
   *    that the SDK sets a valid Authorization header.
   * 5. Call the same analytics endpoint again on the authenticated connection and
   *    assert that it succeeds and returns a properly shaped paginated
   *    analytics page.
   */

  // 1. Prepare a valid analytics request body within a recent 24-hour window
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const requestBody = {
    from: yesterday.toISOString(),
    to: now.toISOString(),
    granularity: "day",
    groupBy: ["shippingMethod"],
    sellerId: null,
    countryCode: null,
    regionCode: null,
    shippingMethodCode: null,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallShippingPerformanceAnalytics.IRequest;

  // 2. Build an unauthenticated connection without Authorization header
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Call analytics endpoint without token and expect some authorization error
  await TestValidator.error(
    "shipping performance analytics must reject unauthenticated access",
    async () => {
      await api.functional.shoppingMall.admin.analytics.shippingPerformance.index(
        unauthenticated,
        { body: requestBody },
      );
    },
  );

  // 4. Perform admin join to obtain a valid Authorization token on the
  //    original connection
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });

  // 5. With authenticated connection, the same analytics call should succeed
  const page: IPageIShoppingMallShippingPerformanceAnalytics.ISummary =
    await api.functional.shoppingMall.admin.analytics.shippingPerformance.index(
      connection,
      { body: requestBody },
    );

  // 6. Validate response structure using typia.assert (no additional checks)
  typia.assert(page);
}
