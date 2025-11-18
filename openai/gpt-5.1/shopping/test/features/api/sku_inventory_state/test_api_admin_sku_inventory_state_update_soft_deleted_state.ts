import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate that updating a deleted SKU inventory state is rejected.
 *
 * Business context: Admins manage reference inventory state definitions (like
 * "in_stock", "backordered") through the /shoppingMall/admin/skuInventoryStates
 * endpoints. When such a state is deleted (either hard or soft), the
 * configuration should no longer be mutable. This test ensures that once an
 * admin erases a state, any attempt to update it via the PUT endpoint fails
 * with an error instead of resurrecting or modifying the record.
 *
 * Scenario steps:
 *
 * 1. Register an admin by calling POST /auth/admin/join. The SDK will
 *    automatically attach the returned access token to the connection headers,
 *    so subsequent admin-only calls are authenticated.
 * 2. As the authenticated admin, create a new SKU inventory state via POST
 *    /shoppingMall/admin/skuInventoryStates, capturing its id.
 * 3. Erase that inventory state by calling DELETE
 *    /shoppingMall/admin/skuInventoryStates/{skuInventoryStateId}. The actual
 *    implementation may soft-delete (set deleted_at) or hard-delete the row;
 *    the behavior from the client’s perspective is that the state is removed
 *    from active configuration.
 * 4. Attempt to update the same SKU inventory state using PUT
 *    /shoppingMall/admin/skuInventoryStates/{skuInventoryStateId} with a valid
 *    IShoppingMallSkuInventoryState.IUpdate payload that changes fields like
 *    name, description, and is_purchasable.
 * 5. Assert that the update call fails by using TestValidator.error with an async
 *    callback around the update invocation. We do not assert on specific HTTP
 *    status codes or error payloads; we only require that an error is thrown,
 *    demonstrating that deleted configuration records are not updatable.
 */
export async function test_api_admin_sku_inventory_state_update_soft_deleted_state(
  connection: api.IConnection,
) {
  // 1. Admin registration / authentication
  const admin = await api.functional.auth.admin.join(connection, {
    body: typia.random<IShoppingMallAdminJoin.ICreate>(),
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create a fresh SKU inventory state to work with
  const createBody = {
    code: `soft_delete_test_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const created =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(created);

  // 3. Erase the created inventory state
  await api.functional.shoppingMall.admin.skuInventoryStates.erase(connection, {
    skuInventoryStateId: created.id,
  });

  // 4. Attempt to update the erased inventory state and expect an error
  const updateBody = {
    name: `${created.name} (updated)`,
    description: created.description
      ? `${created.description} updated`
      : RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: !created.is_purchasable,
  } satisfies IShoppingMallSkuInventoryState.IUpdate;

  await TestValidator.error(
    "cannot update deleted sku inventory state",
    async () => {
      await api.functional.shoppingMall.admin.skuInventoryStates.update(
        connection,
        {
          skuInventoryStateId: created.id,
          body: updateBody,
        },
      );
    },
  );
}
