import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Verify that an authenticated admin can toggle the `is_purchasable` flag of an
 * existing SKU inventory state without changing its identity fields or
 * soft-delete status.
 *
 * Business workflow validated:
 *
 * 1. Register an admin via POST /auth/admin/join and establish an authenticated
 *    admin context (Authorization header managed by SDK).
 * 2. Create a new SKU inventory state with `is_purchasable = true` via POST
 *    /shoppingMall/admin/skuInventoryStates and capture its id/code.
 * 3. Toggle the state to non-purchasable by calling PUT
 *    /shoppingMall/admin/skuInventoryStates/{skuInventoryStateId} with
 *    `is_purchasable = false`.
 * 4. Assert that `id` and `code` are unchanged and `is_purchasable` is false,
 *    while timestamps behave correctly (created_at stable, updated_at changes)
 *    and `deleted_at` remains null/unchanged.
 * 5. Toggle back to `is_purchasable = true` and re-validate identity stability and
 *    flag behavior.
 */
export async function test_api_admin_sku_inventory_state_update_purchasable_flag_toggle(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Create a new SKU inventory state with is_purchasable = true.
  const createBody = {
    code: `preorder-${RandomGenerator.alphaNumeric(8)}`,
    name: "Preorder",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const createdState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(createdState);

  TestValidator.equals(
    "created state is_purchasable should be true",
    createdState.is_purchasable,
    true,
  );

  const originalId = createdState.id;
  const originalCode = createdState.code;
  const originalName = createdState.name;
  const originalDescription = createdState.description ?? null;
  const originalCreatedAt = createdState.created_at;
  const originalUpdatedAt = createdState.updated_at;
  const originalDeletedAt = createdState.deleted_at ?? null;

  // 3. Toggle is_purchasable to false via update.
  const updateToFalseBody = {
    is_purchasable: false,
  } satisfies IShoppingMallSkuInventoryState.IUpdate;

  const updatedToFalse: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.update(
      connection,
      {
        skuInventoryStateId: originalId,
        body: updateToFalseBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(updatedToFalse);

  // 4. Validate identity stability and flag update after first toggle.
  TestValidator.equals(
    "id must remain unchanged after toggling to false",
    updatedToFalse.id,
    originalId,
  );
  TestValidator.equals(
    "code must remain unchanged after toggling to false",
    updatedToFalse.code,
    originalCode,
  );
  TestValidator.equals(
    "name must remain unchanged after toggling to false",
    updatedToFalse.name,
    originalName,
  );
  TestValidator.equals(
    "description must remain unchanged after toggling to false",
    updatedToFalse.description ?? null,
    originalDescription,
  );
  TestValidator.equals(
    "is_purchasable must be false after first update",
    updatedToFalse.is_purchasable,
    false,
  );
  TestValidator.equals(
    "created_at must remain unchanged after first update",
    updatedToFalse.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at must be changed after first update",
    updatedToFalse.updated_at !== originalUpdatedAt,
  );
  TestValidator.equals(
    "deleted_at must remain unchanged after first update",
    updatedToFalse.deleted_at ?? null,
    originalDeletedAt,
  );

  const updatedOnceUpdatedAt = updatedToFalse.updated_at;

  // 5. Toggle is_purchasable back to true via a second update.
  const updateToTrueBody = {
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.IUpdate;

  const updatedToTrue: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.update(
      connection,
      {
        skuInventoryStateId: originalId,
        body: updateToTrueBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(updatedToTrue);

  // 6. Validate identity stability and flag re-toggle after second update.
  TestValidator.equals(
    "id must remain unchanged after toggling back to true",
    updatedToTrue.id,
    originalId,
  );
  TestValidator.equals(
    "code must remain unchanged after toggling back to true",
    updatedToTrue.code,
    originalCode,
  );
  TestValidator.equals(
    "name must remain unchanged after toggling back to true",
    updatedToTrue.name,
    originalName,
  );
  TestValidator.equals(
    "description must remain unchanged after toggling back to true",
    updatedToTrue.description ?? null,
    originalDescription,
  );
  TestValidator.equals(
    "is_purchasable must be true after second update",
    updatedToTrue.is_purchasable,
    true,
  );
  TestValidator.equals(
    "created_at must remain unchanged after second update",
    updatedToTrue.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at must change again after second update",
    updatedToTrue.updated_at !== updatedOnceUpdatedAt,
  );
  TestValidator.equals(
    "deleted_at must remain unchanged after second update",
    updatedToTrue.deleted_at ?? null,
    originalDeletedAt,
  );
}
