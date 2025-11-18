import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate admin can update basic mutable fields of a SKU inventory state.
 *
 * Business workflow covered:
 *
 * 1. Register a new admin via POST /auth/admin/join to obtain an authenticated
 *    admin context (SDK automatically sets Authorization header).
 * 2. As that admin, create a new SKU inventory state via POST
 *    /shoppingMall/admin/skuInventoryStates with deterministic values for code,
 *    name, description, and is_purchasable.
 * 3. Update the created state via PUT
 *    /shoppingMall/admin/skuInventoryStates/{skuInventoryStateId} providing an
 *    IShoppingMallSkuInventoryState.IUpdate payload that changes only `name`
 *    and `description`, leaving `code` and `is_purchasable` undefined so they
 *    remain unchanged.
 * 4. Assert that the update response:
 *
 *    - Keeps `id` and `code` identical to the original entity
 *    - Keeps `is_purchasable` identical to the original entity
 *    - Reflects the new `name` and `description` values
 *    - Has `updated_at` later than or equal to the original `updated_at` while
 *         `created_at` is unchanged.
 *
 * Error paths (authorization failures, 404, validation errors) are
 * intentionally out of scope for this scenario to keep the test focused on the
 * primary success path and contract behavior.
 */
export async function test_api_admin_sku_inventory_state_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to obtain authenticated admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an initial SKU inventory state with known values.
  const initialCreateBody = {
    code: `in_stock_${RandomGenerator.alphaNumeric(8)}`,
    name: "In Stock",
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 10,
    }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const createdState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: initialCreateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(createdState);

  // Capture original values for comparison.
  const originalId = createdState.id;
  const originalCode = createdState.code;
  const originalIsPurchasable = createdState.is_purchasable;
  const originalCreatedAt = createdState.created_at;
  const originalUpdatedAt = createdState.updated_at;

  // 3. Prepare update payload changing only name and description.
  const updatedName = "In Stock - Default";
  const updatedDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });

  const updateBody = {
    name: updatedName,
    description: updatedDescription,
  } satisfies IShoppingMallSkuInventoryState.IUpdate;

  const updatedState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.update(
      connection,
      {
        skuInventoryStateId: createdState.id,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(updatedState);

  // 4. Validate business and contract expectations.

  // 4-1. Immutable identity fields remain unchanged.
  TestValidator.equals(
    "inventory state id remains unchanged after update",
    updatedState.id,
    originalId,
  );

  TestValidator.equals(
    "inventory state code remains unchanged when not provided in update",
    updatedState.code,
    originalCode,
  );

  // 4-2. is_purchasable remains as originally created.
  TestValidator.equals(
    "is_purchasable remains unchanged when not provided in update",
    updatedState.is_purchasable,
    originalIsPurchasable,
  );

  // 4-3. Mutable fields reflect the new values.
  TestValidator.equals(
    "name field is updated to new value",
    updatedState.name,
    updatedName,
  );

  TestValidator.equals(
    "description field is updated to new value",
    updatedState.description,
    updatedDescription,
  );

  // 4-4. created_at should remain the same; updated_at should be >= original.
  TestValidator.equals(
    "created_at timestamp remains unchanged after update",
    updatedState.created_at,
    originalCreatedAt,
  );

  const originalUpdatedTime = Date.parse(originalUpdatedAt);
  const newUpdatedTime = Date.parse(updatedState.updated_at);

  await TestValidator.predicate(
    "updated_at is not earlier than original updated_at",
    async () => newUpdatedTime >= originalUpdatedTime,
  );
}
