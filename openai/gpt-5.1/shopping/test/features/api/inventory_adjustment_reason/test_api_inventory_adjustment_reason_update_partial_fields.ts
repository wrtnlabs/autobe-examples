import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";

/**
 * Verify partial update semantics for inventory adjustment reasons.
 *
 * This test ensures that PUT
 * /shoppingMall/admin/inventoryAdjustmentReasons/{reasonCode} behaves as a
 * semantic partial update driven by
 * IShoppingMallInventoryAdjustmentReason.IUpdate:
 *
 * 1. Bootstrap an admin using POST /auth/admin/join, which also injects
 *    Authorization header into the shared IConnection.
 * 2. Create a baseline inventory adjustment reason with a known business code
 *    ("PARTIAL_UPDATE") and fully populated fields via POST
 *    /shoppingMall/admin/inventoryAdjustmentReasons.
 * 3. Perform a first partial update providing only `name` in the IUpdate payload
 *    and omitting description, direction, and is_system_managed.
 *
 *    - Confirm that only the name is changed while all omitted fields keep their
 *         original values.
 * 4. Perform a second partial update providing only `is_system_managed`, flipping
 *    it from false to true.
 *
 *    - Confirm that only is_system_managed changes and that name, description, and
 *         direction remain as previously set.
 * 5. Perform a third partial update providing only `direction`, e.g. switching
 *    from "increase" to "decrease".
 *
 *    - Confirm that only direction changes while the other fields stay intact.
 *
 * The test validates that multiple successive partial updates compose correctly
 * and that unspecified fields are never unintentionally reset.
 */
export async function test_api_inventory_adjustment_reason_update_partial_fields(
  connection: api.IConnection,
) {
  // 1. Bootstrap admin via join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create baseline inventory adjustment reason
  const baseCode = "PARTIAL_UPDATE";
  const baseName = "Initial partial update name";
  const baseDescription = "Initial description for partial update test";
  const baseDirection = "increase";
  const baseIsSystemManaged = false;

  const createBody = {
    code: baseCode,
    name: baseName,
    description: baseDescription,
    direction: baseDirection,
    is_system_managed: baseIsSystemManaged,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const created =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallInventoryAdjustmentReason>(created);

  // sanity checks on created vs base
  TestValidator.equals(
    "created.code should equal baseCode",
    created.code,
    baseCode,
  );
  TestValidator.equals(
    "created.name should equal baseName",
    created.name,
    baseName,
  );
  TestValidator.equals(
    "created.description should equal baseDescription",
    created.description,
    baseDescription,
  );
  TestValidator.equals(
    "created.direction should equal baseDirection",
    created.direction,
    baseDirection,
  );
  TestValidator.equals(
    "created.is_system_managed should equal baseIsSystemManaged",
    created.is_system_managed,
    baseIsSystemManaged,
  );

  // 3. First partial update: change only name
  const updatedNameValue = "Renamed reason after first partial update";
  const updateBody1 = {
    name: updatedNameValue,
  } satisfies IShoppingMallInventoryAdjustmentReason.IUpdate;

  const updatedName =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.update(
      connection,
      {
        reasonCode: baseCode,
        body: updateBody1,
      },
    );
  typia.assert<IShoppingMallInventoryAdjustmentReason>(updatedName);

  TestValidator.equals(
    "first update: name should be changed",
    updatedName.name,
    updatedNameValue,
  );
  TestValidator.equals(
    "first update: description should remain unchanged",
    updatedName.description,
    created.description,
  );
  TestValidator.equals(
    "first update: direction should remain unchanged",
    updatedName.direction,
    created.direction,
  );
  TestValidator.equals(
    "first update: is_system_managed should remain unchanged",
    updatedName.is_system_managed,
    created.is_system_managed,
  );

  // 4. Second partial update: toggle only is_system_managed
  const updatedIsSystemManaged = !created.is_system_managed;
  const updateBody2 = {
    is_system_managed: updatedIsSystemManaged,
  } satisfies IShoppingMallInventoryAdjustmentReason.IUpdate;

  const updatedFlag =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.update(
      connection,
      {
        reasonCode: baseCode,
        body: updateBody2,
      },
    );
  typia.assert<IShoppingMallInventoryAdjustmentReason>(updatedFlag);

  TestValidator.equals(
    "second update: name should remain from first update",
    updatedFlag.name,
    updatedName.name,
  );
  TestValidator.equals(
    "second update: description should remain unchanged from base",
    updatedFlag.description,
    created.description,
  );
  TestValidator.equals(
    "second update: direction should remain unchanged from base",
    updatedFlag.direction,
    created.direction,
  );
  TestValidator.equals(
    "second update: is_system_managed should be toggled",
    updatedFlag.is_system_managed,
    updatedIsSystemManaged,
  );

  // 5. Third partial update: change only direction
  const updatedDirectionValue =
    created.direction === "increase" ? "decrease" : "increase";
  const updateBody3 = {
    direction: updatedDirectionValue,
  } satisfies IShoppingMallInventoryAdjustmentReason.IUpdate;

  const updatedDirection =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.update(
      connection,
      {
        reasonCode: baseCode,
        body: updateBody3,
      },
    );
  typia.assert<IShoppingMallInventoryAdjustmentReason>(updatedDirection);

  TestValidator.equals(
    "third update: direction should be updated",
    updatedDirection.direction,
    updatedDirectionValue,
  );
  TestValidator.equals(
    "third update: name should remain from first update",
    updatedDirection.name,
    updatedName.name,
  );
  TestValidator.equals(
    "third update: description should remain from base",
    updatedDirection.description,
    created.description,
  );
  TestValidator.equals(
    "third update: is_system_managed should remain from second update",
    updatedDirection.is_system_managed,
    updatedIsSystemManaged,
  );
}
