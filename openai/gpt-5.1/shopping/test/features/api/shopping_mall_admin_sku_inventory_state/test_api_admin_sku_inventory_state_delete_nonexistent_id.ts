import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Verify that deleting a non-existent SKU inventory state as an admin behaves
 * in a stable, idempotent-friendly way and does not accidentally target an
 * existing record.
 *
 * Business context:
 *
 * - SKU inventory states are reference data used across catalog and ordering
 *   flows.
 * - Admins may occasionally issue delete calls for ids that no longer exist (for
 *   example, due to race conditions or repeated operations).
 * - The API must handle such deletes safely without crashing the client or
 *   corrupting unrelated records.
 *
 * Steps:
 *
 * 1. Join as an admin to obtain an authenticated context.
 * 2. Create a real SKU inventory state via the admin create endpoint.
 * 3. Generate a random UUID that is guaranteed to be different from the created
 *    state's id.
 * 4. Call the erase endpoint with the non-existent id.
 * 5. Assert that:
 *
 *    - The non-existent id is different from the created state's id (sanity check
 *         that we did not delete the real record).
 *    - The erase call completes without throwing at the SDK layer, demonstrating
 *         stable behavior for non-existent targets.
 */
export async function test_api_admin_sku_inventory_state_delete_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authenticated context
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

  // 2. Create a real SKU inventory state as baseline data
  const createdState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: typia.random<IShoppingMallSkuInventoryState.ICreate>(),
      },
    );
  typia.assert(createdState);

  // 3. Generate a UUID that does not match the created state's id
  let nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonExistentId === createdState.id) {
    nonExistentId = typia.random<string & tags.Format<"uuid">>();
  }

  TestValidator.notEquals(
    "non-existent id should be different from created inventory state id",
    nonExistentId,
    createdState.id,
  );

  // 4. Call erase with the non-existent id; expect no exception at SDK level
  await api.functional.shoppingMall.admin.skuInventoryStates.erase(connection, {
    skuInventoryStateId: nonExistentId,
  });
}
