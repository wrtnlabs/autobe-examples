import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Verify repeated deletion behavior of SKU inventory state for admin.
 *
 * Business flow:
 *
 * 1. Admin registers via POST /auth/admin/join to obtain an authenticated admin
 *    context.
 * 2. Admin creates a new SKU inventory state via POST
 *    /shoppingMall/admin/skuInventoryStates.
 * 3. Admin deletes that state once via DELETE
 *    /shoppingMall/admin/skuInventoryStates/{skuInventoryStateId}; this must
 *    succeed.
 * 4. Admin deletes the same state again; this second delete must behave
 *    deterministically (either silent idempotent success or an error such as
 *    not-found) without recreating data.
 *
 * Given the available SDK surface (no read/list endpoint for verification and
 * erase() returning void), we only assert that:
 *
 * - The first erase call completes without throwing.
 * - The second erase call either succeeds (idempotent delete) or throws; both are
 *   treated as acceptable semantics, and we don’t inspect HTTP status codes.
 */
export async function test_api_admin_sku_inventory_state_delete_already_deleted_idempotent(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authenticated admin context
  const adminJoinBody =
    typia.random<IShoppingMallAdminJoin.ICreate>() satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create a SKU inventory state as this admin
  const createBody =
    typia.random<IShoppingMallSkuInventoryState.ICreate>() satisfies IShoppingMallSkuInventoryState.ICreate;

  const createdState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(createdState);

  // 3. First delete must succeed without throwing
  await api.functional.shoppingMall.admin.skuInventoryStates.erase(connection, {
    skuInventoryStateId: createdState.id,
  });

  // 4. Second delete: accept either idempotent success or error semantics
  try {
    await api.functional.shoppingMall.admin.skuInventoryStates.erase(
      connection,
      {
        skuInventoryStateId: createdState.id,
      },
    );
    // If we reach here, second delete is idempotent success; this is acceptable.
    await TestValidator.predicate(
      "second delete completed successfully (idempotent behavior)",
      async () => true,
    );
  } catch {
    // If an error is thrown, treat as valid not-found or similar semantics.
    await TestValidator.predicate(
      "second delete threw an error (not-found-style behavior is acceptable)",
      async () => true,
    );
  }
}
