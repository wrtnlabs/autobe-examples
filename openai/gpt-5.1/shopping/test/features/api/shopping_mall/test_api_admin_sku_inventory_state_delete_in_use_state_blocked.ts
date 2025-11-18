import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate deletion and re-creation of SKU inventory states by an admin.
 *
 * Business context
 *
 * - Administrators configure SKU inventory states (like `in_stock`, `damaged`,
 *   `blocked`).
 * - Codes must be unique across all states.
 * - Deleting a state should free up its unique code for reuse.
 *
 * What this test validates (within available APIs)
 *
 * 1. An admin can join and receive an authorized context.
 * 2. The admin can create a new SKU inventory state with a unique `code`.
 * 3. The admin can delete that inventory state via the erase endpoint.
 * 4. After deletion, another state using the same `code` can be created again,
 *    proving that the delete operation actually removed the underlying record
 *    and released the uniqueness constraint on `code`.
 *
 * NOTE: The original human scenario described blocking deletion when the
 * inventory state is in use by SKUs or inventory adjustments. The current API
 * surface does not expose SKU or inventory adjustment operations, so this test
 * focuses on the positive path (successful deletion and subsequent recreation
 * with the same code). It still provides meaningful coverage of admin
 * authorization, state creation, deletion, and code uniqueness.
 */
export async function test_api_admin_sku_inventory_state_delete_in_use_state_blocked(
  connection: api.IConnection,
) {
  // 1. Admin joins (register + authenticate)
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Admin creates an inventory state with a specific code
  const firstStateBody = typia.random<IShoppingMallSkuInventoryState.ICreate>();
  const firstState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: firstStateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(firstState);

  TestValidator.equals(
    "created state code must match request body",
    firstState.code,
    firstStateBody.code,
  );

  // 3. Delete the created inventory state
  await api.functional.shoppingMall.admin.skuInventoryStates.erase(connection, {
    skuInventoryStateId: firstState.id,
  });

  // 4. Re-create another state with the same code; this should succeed
  const secondStateBody = {
    ...firstStateBody,
    // Ensure we slightly vary name/description to show they are independent rows
    name: `${firstStateBody.name}-recreated`,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const secondState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: secondStateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(secondState);

  // Validate that the code was reused successfully
  TestValidator.equals(
    "recreated state code must equal original code",
    secondState.code,
    firstStateBody.code,
  );

  // Ensure the second state is a distinct record (new id)
  TestValidator.notEquals(
    "recreated state must have a different id from the original",
    secondState.id,
    firstState.id,
  );
}
