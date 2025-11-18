import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_sku_inventory_state_update_code_uniqueness_conflict(
  connection: api.IConnection,
) {
  // 1. Admin joins (authentication)
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

  // 2. Create inventory state A with code "in_stock"
  const stateACode = "in_stock";
  const createStateABody = {
    code: stateACode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const stateA: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: createStateABody,
      },
    );
  typia.assert(stateA);
  TestValidator.equals(
    "created state A should have requested code",
    stateA.code,
    stateACode,
  );

  // 3. Create inventory state B with code "preorder"
  const stateBOriginalCode = "preorder";
  const createStateBBody = {
    code: stateBOriginalCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const stateB: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: createStateBBody,
      },
    );
  typia.assert(stateB);
  TestValidator.equals(
    "created state B should have requested original code",
    stateB.code,
    stateBOriginalCode,
  );

  // 4. Try to update B's code to A's code (expect uniqueness conflict)
  const conflictingUpdateBody = {
    code: stateACode,
  } satisfies IShoppingMallSkuInventoryState.IUpdate;

  await TestValidator.error(
    "updating B's code to an existing code should fail due to uniqueness constraint",
    async () => {
      await api.functional.shoppingMall.admin.skuInventoryStates.update(
        connection,
        {
          skuInventoryStateId: stateB.id,
          body: conflictingUpdateBody,
        },
      );
    },
  );

  // 5. Perform a valid update on B to confirm entity remains usable and code unchanged.
  const validUpdateBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallSkuInventoryState.IUpdate;

  const updatedB: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.update(
      connection,
      {
        skuInventoryStateId: stateB.id,
        body: validUpdateBody,
      },
    );
  typia.assert(updatedB);

  // Code should remain the original unique value because conflicting update failed
  TestValidator.equals(
    "state B code should remain original after conflict attempt and valid update",
    updatedB.code,
    stateBOriginalCode,
  );

  // Name should be updated to the new value
  TestValidator.equals(
    "state B name should be updated by valid update",
    updatedB.name,
    validUpdateBody.name,
  );
}
