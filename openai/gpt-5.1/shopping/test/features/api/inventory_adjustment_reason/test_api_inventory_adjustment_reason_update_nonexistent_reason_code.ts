import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallInventoryAdjustmentReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAdjustmentReason";

export async function test_api_inventory_adjustment_reason_update_nonexistent_reason_code(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Prepare a clearly non-existent reasonCode
  const nonExistentReasonCode: string = `NON_EXISTENT_REASON_${RandomGenerator.alphaNumeric(16)}`;

  // 3. Prepare a syntactically valid update body
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    direction: RandomGenerator.pick([
      "increase",
      "decrease",
      "neutral",
    ] as const),
    is_system_managed: false,
  } satisfies IShoppingMallInventoryAdjustmentReason.IUpdate;

  // 4. Call update with the nonexistent reason code and ensure an error occurs
  await TestValidator.error(
    "updating a non-existent inventory adjustment reason should fail",
    async () => {
      await api.functional.shoppingMall.admin.inventoryAdjustmentReasons.update(
        connection,
        {
          reasonCode: nonExistentReasonCode,
          body: updateBody,
        },
      );
    },
  );
}
