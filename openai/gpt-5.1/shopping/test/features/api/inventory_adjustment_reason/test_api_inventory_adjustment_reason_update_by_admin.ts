import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";

export async function test_api_inventory_adjustment_reason_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin (auth context setup)
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

  // 2. Create initial inventory adjustment reason with deterministic code
  const createBody = {
    code: "ADJUST_INBOUND",
    name: "Inbound Adjustment",
    description: "Initial description for inbound stock adjustment.",
    direction: "increase",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const created: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallInventoryAdjustmentReason>(created);

  // Basic sanity checks on created entity
  TestValidator.equals(
    "created reason code matches requested code",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created name matches requested name",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "created direction matches requested direction",
    created.direction,
    createBody.direction,
  );
  TestValidator.equals(
    "created is_system_managed matches requested flag",
    created.is_system_managed,
    createBody.is_system_managed,
  );

  const originalId = created.id;
  const originalCode = created.code;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  // 3. Update the inventory adjustment reason via PUT using reasonCode path param
  const updateBody = {
    name: "Inbound Adjustment Updated",
    description: "Updated description after admin correction.",
    direction: "decrease",
    is_system_managed: true,
  } satisfies IShoppingMallInventoryAdjustmentReason.IUpdate;

  const updated: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.update(
      connection,
      {
        reasonCode: "ADJUST_INBOUND",
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallInventoryAdjustmentReason>(updated);

  // 4. Validate immutable/stable fields remain unchanged
  TestValidator.equals(
    "updated id remains same as original",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "updated code remains same as original",
    updated.code,
    originalCode,
  );
  TestValidator.equals(
    "created_at remains unchanged after update",
    updated.created_at,
    originalCreatedAt,
  );

  // 5. Validate mutable fields reflect new values
  TestValidator.equals(
    "updated name matches new value",
    updated.name,
    updateBody.name,
  );
  TestValidator.equals(
    "updated description matches new value",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "updated direction matches new value",
    updated.direction,
    updateBody.direction,
  );
  TestValidator.equals(
    "updated is_system_managed flag matches new value",
    updated.is_system_managed,
    updateBody.is_system_managed,
  );

  // 6. Validate updated_at has advanced (lexicographically larger ISO string)
  TestValidator.predicate(
    "updated_at is later than or equal to original updated_at",
    updated.updated_at >= originalUpdatedAt,
  );
}
