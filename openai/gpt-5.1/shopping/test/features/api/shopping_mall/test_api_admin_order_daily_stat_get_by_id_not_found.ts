import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallOrderDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDailyStat";

/**
 * Validate that requesting a non-existent daily order statistics snapshot as an
 * authenticated admin results in an error (not-found style) and does not return
 * a valid IShoppingMallOrderDailyStat record.
 *
 * Business intent
 *
 * - Admin analytics consumers must not receive fabricated or stale data when
 *   requesting a snapshot ID that does not exist in
 *   `shopping_mall_order_daily_stats`.
 * - The platform should fail cleanly for such IDs instead of succeeding with
 *   arbitrary or default values.
 *
 * High level scenario
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated
 *    connection (the SDK automatically wires Authorization header).
 * 2. Generate a random UUID that is extremely unlikely to match any existing
 *    snapshot primary key.
 * 3. Call GET /shoppingMall/admin/analytics/orderDailyStats/{orderDailyStatId}
 *    with this random UUID.
 * 4. Confirm that the call fails (throws an error) instead of returning a
 *    IShoppingMallOrderDailyStat object.
 *
 * Notes
 *
 * - E2E constraints prohibit explicit status-code assertions, so we only assert
 *   that an error occurs, not the exact HTTP status (e.g. 404).
 * - We also do not attempt to introspect the error body for internal details
 *   because there is no dedicated error DTO in this context; we just rely on
 *   the fact that the call fails.
 */
export async function test_api_admin_order_daily_stat_get_by_id_not_found(
  connection: api.IConnection,
) {
  // 1. Join an admin to authenticate the connection
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Generate a random UUID to act as a non-existent orderDailyStatId
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();

  // 3-4. Expect the analytics detail call with this ID to fail
  await TestValidator.error(
    "non-existent order daily stat id should cause error",
    async () => {
      await api.functional.shoppingMall.admin.analytics.orderDailyStats.at(
        connection,
        {
          orderDailyStatId: nonexistentId,
        },
      );
    },
  );
}
