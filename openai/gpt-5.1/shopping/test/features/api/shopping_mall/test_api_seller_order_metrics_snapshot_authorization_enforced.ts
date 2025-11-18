import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerOrderMetricsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOrderMetricsSnapshot";

/**
 * Verify authorization enforcement on seller order metrics snapshot retrieval.
 *
 * This test ensures that the admin analytics endpoint GET
 * /shoppingMall/admin/sellerOrderMetricsSnapshots/{snapshotId} cannot be
 * accessed without proper admin authentication.
 *
 * Business workflow validated:
 *
 * 1. Unauthenticated access is rejected.
 * 2. Authenticated customer (non-admin) access is rejected.
 * 3. Authenticated admin access is allowed and returns a valid
 *    IShoppingMallSellerOrderMetricsSnapshot payload.
 */
export async function test_api_seller_order_metrics_snapshot_authorization_enforced(
  connection: api.IConnection,
) {
  // Prepare a syntactically valid snapshotId. We do not require it to exist
  // because we are validating authorization behavior, not 404 vs 403 details.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();

  // 1. Unauthenticated access: clone connection with empty headers to simulate
  //    no Authorization header. Never touch headers afterwards.
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated actor cannot access admin seller metrics snapshot",
    async () => {
      await api.functional.shoppingMall.admin.sellerOrderMetricsSnapshots.at(
        unauthenticated,
        { snapshotId },
      );
    },
  );

  // 2. Authenticate as customer via /auth/customer/join.
  const customerJoinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();

  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    {
      body: customerJoinBody,
    },
  );
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // The shared connection now carries a customer Authorization token
  // managed by the SDK.
  await TestValidator.error(
    "customer actor cannot access admin seller metrics snapshot",
    async () => {
      await api.functional.shoppingMall.admin.sellerOrderMetricsSnapshots.at(
        connection,
        { snapshotId },
      );
    },
  );

  // 3. Authenticate as admin via /auth/admin/join on the same connection.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. Admin access must now succeed and return a valid
  //    IShoppingMallSellerOrderMetricsSnapshot payload.
  const snapshot =
    await api.functional.shoppingMall.admin.sellerOrderMetricsSnapshots.at(
      connection,
      { snapshotId },
    );
  typia.assert<IShoppingMallSellerOrderMetricsSnapshot>(snapshot);
}
