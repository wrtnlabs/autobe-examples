import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate behavior when updating a non-existent SKU inventory state.
 *
 * Business goals:
 *
 * - Ensure the admin-only update endpoint does NOT create records when given an
 *   unknown skuInventoryStateId.
 * - Ensure the API distinguishes clearly between existing and non-existing IDs
 *   and surfaces a not-found style error for the latter.
 *
 * Test workflow:
 *
 * 1. Join an admin via POST /auth/admin/join, which also issues JWT tokens and
 *    wires them into the shared connection.
 * 2. Create a real SKU inventory state via POST
 *    /shoppingMall/admin/skuInventoryStates to confirm normal behavior and that
 *    authentication and configuration are valid.
 * 3. Generate a random UUID that is different from the created state's id and with
 *    high probability not associated with any existing record.
 * 4. Call PUT /shoppingMall/admin/skuInventoryStates/{skuInventoryStateId} with
 *    that random UUID and a valid IShoppingMallSkuInventoryState.IUpdate
 *    payload.
 * 5. Assert that the call results in an HTTP 404-style not found error rather than
 *    succeeding or creating a new resource.
 */
export async function test_api_admin_sku_inventory_state_update_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a real SKU inventory state to ensure endpoint works normally
  const createBody = {
    code: `state_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const createdState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdState);

  // 3. Generate a random UUID distinct from the created state's id
  const randomId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const targetId: string & tags.Format<"uuid"> =
    randomId === createdState.id
      ? typia.random<string & tags.Format<"uuid">>()
      : randomId;

  // 4. Prepare a valid update payload
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_purchasable: false,
  } satisfies IShoppingMallSkuInventoryState.IUpdate;

  // 5. Assert that updating with a non-existent id yields a 404-style HTTP error
  await TestValidator.httpError(
    "admin update on non-existent sku inventory state id must return 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.skuInventoryStates.update(
        connection,
        {
          skuInventoryStateId: targetId,
          body: updateBody,
        },
      );
    },
  );
}
