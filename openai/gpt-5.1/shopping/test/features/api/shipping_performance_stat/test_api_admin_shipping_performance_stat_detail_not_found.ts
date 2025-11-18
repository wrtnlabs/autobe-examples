import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallShippingPerformanceStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPerformanceStat";

/**
 * Ensure admin shipping performance stat detail endpoint fails for a
 * non-existent snapshot ID.
 *
 * Business context
 *
 * - Admin analytics UIs may hold or generate UUIDs that no longer correspond to
 *   existing entries in `shopping_mall_shipping_performance_stats` (for
 *   example, stale links, manual URL edits, or race conditions with cleanup
 *   jobs).
 * - The backend must not return a valid `IShoppingMallShippingPerformanceStat`
 *   object for such IDs; instead, it should signal an error (typically a
 *   not-found condition) while remaining within the authenticated admin
 *   context.
 *
 * What this test verifies
 *
 * 1. An administrator can successfully join (register) and obtain an authorization
 *    context via `POST /auth/admin/join`.
 * 2. Using that authenticated admin connection, a request to `GET
 *    /shoppingMall/admin/analytics/shippingPerformanceStats/{shippingPerformanceStatId}`
 *    with a randomly generated UUID (which is overwhelmingly unlikely to match
 *    a real snapshot ID) results in a failure.
 * 3. The failure is observed as an exception thrown by the SDK, captured via
 *    `TestValidator.error`. We do not depend on any particular HTTP status code
 *    or error body shape; we only assert that the call does not succeed.
 *
 * High-level flow
 *
 * 1. Build a valid `IShoppingMallAdminJoin.ICreate` payload using `typia.random`
 *    for each required field (email, password, href, referrer). The optional
 *    `ip` field is omitted.
 * 2. Call `api.functional.auth.admin.join` with that payload and assert the
 *    returned `IShoppingMallAdmin.IAuthorized` structure via `typia.assert`.
 *    This call also configures `connection.headers.Authorization` internally.
 * 3. Generate a random UUID via `typia.random<string & tags.Format<"uuid">>()` to
 *    serve as a non-existent `shippingPerformanceStatId`.
 * 4. Wrap a call to
 *    `api.functional.shoppingMall.admin.analytics.shippingPerformanceStats.at`
 *    in `TestValidator.error` with an async closure, passing the random UUID as
 *    the path parameter. The test passes when this call throws an error and
 *    fails if it unexpectedly returns a valid stats snapshot.
 */
export async function test_api_admin_shipping_performance_stat_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Generate a UUID that should not correspond to any existing snapshot
  const missingId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Verify that requesting detail with the missing ID results in an error
  await TestValidator.error(
    "non-existent shipping performance stat detail must fail",
    async () => {
      await api.functional.shoppingMall.admin.analytics.shippingPerformanceStats.at(
        connection,
        {
          shippingPerformanceStatId: missingId,
        },
      );
    },
  );
}
