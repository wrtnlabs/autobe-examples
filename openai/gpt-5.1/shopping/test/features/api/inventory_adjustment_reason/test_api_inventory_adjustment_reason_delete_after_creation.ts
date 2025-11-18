import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";

export async function test_api_inventory_adjustment_reason_delete_after_creation(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Use realistic but arbitrary URIs for href and referrer
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new inventory adjustment reason (non-system-managed)
  const reasonCode = `TEST_ADJ_${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    code: reasonCode,
    name: `Test adjustment reason ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    direction: "increase",
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.ICreate;

  const createdReason: IShoppingMallInventoryAdjustmentReason =
    await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallInventoryAdjustmentReason>(createdReason);

  // Business assertion: created reason code matches requested code
  TestValidator.equals(
    "created inventory adjustment reason code should match request payload",
    createdReason.code,
    reasonCode,
  );

  // 3. Delete the created inventory adjustment reason by business key (code)
  await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.erase(
    connection,
    {
      reasonCode: createdReason.code,
    },
  );

  // 4. Optional negative path: deleting again should result in an error
  await TestValidator.error(
    "deleting an already-deleted inventory adjustment reason should fail",
    async () => {
      await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.erase(
        connection,
        {
          reasonCode: createdReason.code,
        },
      );
    },
  );
}
