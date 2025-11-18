import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";

/**
 * Validate that an admin can clear the description of an inventory adjustment
 * reason by updating it with `description: null` while leaving other fields
 * unchanged.
 *
 * Business steps:
 *
 * 1. Admin joins (POST /auth/admin/join) to obtain authorized context.
 * 2. Admin creates an inventory adjustment reason with code "CLEAR_DESC_TEST",
 *    non-null description, and valid name/direction/is_system_managed.
 * 3. Admin updates that reason by calling PUT
 *    /shoppingMall/admin/inventoryAdjustmentReasons/{reasonCode} with
 *    reasonCode = "CLEAR_DESC_TEST" and an update body where description is
 *    explicitly set to null and no other fields are provided.
 * 4. Verify that the response shows description = null and that immutable or
 *    unchanged fields (code, name, direction, is_system_managed, id) match the
 *    original record, acknowledging that updated_at may differ.
 */
export async function test_api_inventory_adjustment_reason_update_description_to_null(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Create an inventory adjustment reason with non-null description
  const reasonCode = "CLEAR_DESC_TEST";
  const createBody = {
    code: reasonCode,
    name: "Clear description test reason",
    description: "Initial non-null description for clear-to-null scenario",
    direction: "increase",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const created: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallInventoryAdjustmentReason>(created);

  // Capture original values that must remain unchanged
  const originalId = created.id;
  const originalCode = created.code;
  const originalName = created.name;
  const originalDirection = created.direction;
  const originalIsSystemManaged = created.is_system_managed;

  // Sanity checks on creation
  TestValidator.equals(
    "created reason code matches requested code",
    created.code,
    reasonCode,
  );
  TestValidator.equals(
    "created reason description is non-null before update",
    created.description,
    createBody.description ?? null,
  );

  // 3. Update the reason setting description explicitly to null
  const updateBody = {
    description: null,
  } satisfies IShoppingMallInventoryAdjustmentReason.IUpdate;

  const updated: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.update(
      connection,
      {
        reasonCode,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallInventoryAdjustmentReason>(updated);

  // 4. Validate that description is now null and other fields are preserved
  TestValidator.equals(
    "updated reason id is preserved",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "updated reason code is preserved",
    updated.code,
    originalCode,
  );
  TestValidator.equals(
    "updated reason name is preserved",
    updated.name,
    originalName,
  );
  TestValidator.equals(
    "updated reason direction is preserved",
    updated.direction,
    originalDirection,
  );
  TestValidator.equals(
    "updated reason is_system_managed flag is preserved",
    updated.is_system_managed,
    originalIsSystemManaged,
  );
  TestValidator.equals(
    "updated reason description is explicitly null after update",
    updated.description,
    null,
  );
}
