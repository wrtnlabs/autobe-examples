import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerOrderMetricsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOrderMetricsSnapshot";

/**
 * Validate not-found handling for seller order metrics snapshot lookup.
 *
 * ## Business goal
 *
 * Ensure that when an administrator queries a seller order metrics snapshot by
 * ID using the admin analytics endpoint, and the provided snapshotId does not
 * correspond to any existing row in
 * `shopping_mall_seller_order_metrics_snapshots`, the platform responds with an
 * error (HTTP-layer or domain-layer) rather than a successful payload, and that
 * it does not leak internal implementation details such as stack traces.
 *
 * ## High-level flow
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated admin
 *    connection (token is automatically wired into the connection headers by
 *    the SDK).
 * 2. Generate a syntactically valid UUID to be used as snapshotId that is
 *    extremely unlikely to exist in the snapshots table.
 * 3. Call GET /shoppingMall/admin/sellerOrderMetricsSnapshots/{snapshotId} through
 *    `api.functional.shoppingMall.admin.sellerOrderMetricsSnapshots.at` using
 *    the authenticated connection and the generated snapshotId.
 * 4. Assert that the call fails (throws) instead of returning a
 *    `IShoppingMallSellerOrderMetricsSnapshot` instance, using
 *    `TestValidator.error` with an async callback.
 * 5. For this e2e test, do not assert specific HTTP status codes or error body
 *    structure, only that an error is raised for the not-found case, which
 *    implicitly validates that a normal snapshot payload is not returned.
 */
export async function test_api_seller_order_metrics_snapshot_not_found_handling(
  connection: api.IConnection,
) {
  // 1. Register admin and obtain authorized context
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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Generate a valid but non-existent snapshotId (UUID)
  const nonExistentSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3 & 4. Call the metrics snapshot endpoint expecting an error
  await TestValidator.error(
    "requesting non-existent seller order metrics snapshot must fail",
    async () => {
      await api.functional.shoppingMall.admin.sellerOrderMetricsSnapshots.at(
        connection,
        {
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );
}
