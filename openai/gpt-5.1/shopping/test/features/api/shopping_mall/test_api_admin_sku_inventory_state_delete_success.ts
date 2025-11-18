import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate that an authenticated admin can delete a SKU inventory state and
 * that repeated deletion attempts fail.
 *
 * Business context:
 *
 * - Inventory state definitions (IShoppingMallSkuInventoryState) are
 *   admin-managed reference data controlling how SKU inventory behaves (e.g.,
 *   in_stock, out_of_stock, preorder, etc.).
 * - Only admins should be able to create and delete these states.
 * - Once an inventory state is deleted, it should no longer be deletable again,
 *   which we validate by a second erase attempt.
 *
 * Test flow:
 *
 * 1. Admin join
 *
 *    - Call POST /auth/admin/join via api.functional.auth.admin.join.
 *    - Provide a valid IShoppingMallAdminJoin.ICreate body with random but realistic
 *         values: email, password, href, referrer. Omit ip (optional) for
 *         simplicity.
 *    - Typia.assert on the IShoppingMallAdmin.IAuthorized response to ensure type
 *         correctness.
 *    - Rely on join to set connection.headers.Authorization for admin.
 * 2. Create SKU inventory state
 *
 *    - As the authenticated admin, call
 *         api.functional.shoppingMall.admin.skuInventoryStates.create with a
 *         body satisfying IShoppingMallSkuInventoryState.ICreate.
 *    - Generate values:
 *
 *         - Code: a short machine-readable code using RandomGenerator (e.g., alphabetic
 *                   string) to avoid collisions in typical runs.
 *         - Name: human-readable label using RandomGenerator.name.
 *         - Description: optional descriptive paragraph using RandomGenerator.paragraph.
 *         - Is_purchasable: random boolean via typia.random<boolean>().
 *    - Assert the returned IShoppingMallSkuInventoryState with typia.assert and keep
 *         the entity for later steps.
 * 3. First delete (success path)
 *
 *    - Call api.functional.shoppingMall.admin.skuInventoryStates.erase with
 *         skuInventoryStateId set to the created state's id.
 *    - Since erase returns void, just ensure the call completes successfully (no
 *         exception thrown).
 * 4. Second delete (expected failure path)
 *
 *    - Attempt to erase the same skuInventoryStateId again.
 *    - Wrap this second call in TestValidator.error with an async closure and a
 *         descriptive title like "second erase on same skuInventoryStateId
 *         should fail".
 *    - We do not assert any specific HTTP status code; we just verify that an error
 *         is thrown, which indicates the record is no longer deletable and thus
 *         effectively removed from normal flows.
 */
export async function test_api_admin_sku_inventory_state_delete_success(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated admin context
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

  // 2. Create a new SKU inventory state as this admin
  const skuInventoryStateCreateBody = {
    code: `state_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    is_purchasable: typia.random<boolean>(),
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const createdState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(createdState);

  // Sanity validation that created entity matches basic expectations
  TestValidator.equals(
    "created inventory state code should match request code",
    createdState.code,
    skuInventoryStateCreateBody.code,
  );
  TestValidator.equals(
    "created inventory state name should match request name",
    createdState.name,
    skuInventoryStateCreateBody.name,
  );
  TestValidator.equals(
    "created inventory state is_purchasable should match request",
    createdState.is_purchasable,
    skuInventoryStateCreateBody.is_purchasable,
  );

  // 3. First delete should succeed
  await api.functional.shoppingMall.admin.skuInventoryStates.erase(connection, {
    skuInventoryStateId: createdState.id,
  });

  // 4. Second delete should fail (record already erased / not found)
  await TestValidator.error(
    "second erase on same skuInventoryStateId should fail",
    async () => {
      await api.functional.shoppingMall.admin.skuInventoryStates.erase(
        connection,
        {
          skuInventoryStateId: createdState.id,
        },
      );
    },
  );
}
