import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingPerformanceByDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingPerformanceByDay";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingPerformanceByDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPerformanceByDay";

/**
 * Verify that daily shipping performance statistics are protected by admin
 * authentication.
 *
 * Business goal:
 *
 * - Ensure operational KPIs about shipping performance are only exposed to
 *   authenticated admins.
 * - Demonstrate that the statistics endpoint cannot be accessed anonymously, but
 *   works correctly when called with a valid admin session established via
 *   /auth/admin/join.
 *
 * Step-by-step process:
 *
 * 1. Clone the shared test connection into an unauthenticated connection by
 *    overwriting headers with an empty object, so it carries no Authorization
 *    token.
 * 2. Call GET /shoppingMall/admin/statistics/shippingPerformanceByDay using this
 *    unauthenticated connection and assert that the call results in an error
 *    using TestValidator.error, without checking specific HTTP status codes.
 * 3. Join an administrator via POST /auth/admin/join using the original
 *    connection. The SDK will automatically set
 *    connection.headers.Authorization with a valid access token.
 * 4. Validate the join response structure and the embedded token using
 *    typia.assert.
 * 5. Call the statistics endpoint again using the now-authenticated original
 *    connection and assert that it succeeds and returns a well-formed
 *    IPageIShoppingMallShippingPerformanceByDay payload.
 * 6. Perform light business-level sanity checks on pagination values and
 *    individually assert each row in the data array as a valid
 *    IShoppingMallShippingPerformanceByDay.
 */
export async function test_api_admin_shipping_performance_by_day_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Unauthenticated call must fail
  await TestValidator.error(
    "shipping performance by day requires admin authentication",
    async () => {
      await api.functional.shoppingMall.admin.statistics.shippingPerformanceByDay.index(
        unauthenticatedConnection,
      );
    },
  );

  // 3. Join an admin and obtain valid authorization context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 4. Authenticated call should succeed and return a well-formed page of stats
  const page: IPageIShoppingMallShippingPerformanceByDay =
    await api.functional.shoppingMall.admin.statistics.shippingPerformanceByDay.index(
      connection,
    );
  typia.assert(page);

  // 5. Basic business-level sanity checks on pagination semantics
  TestValidator.predicate(
    "pagination current page index must be non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit must be non-negative",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records must be non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages must be non-negative",
    page.pagination.pages >= 0,
  );

  // 6. When data rows exist, spot-check that each row is a valid shipping performance snapshot
  for (const row of page.data) {
    typia.assert<IShoppingMallShippingPerformanceByDay>(row);
  }
}
