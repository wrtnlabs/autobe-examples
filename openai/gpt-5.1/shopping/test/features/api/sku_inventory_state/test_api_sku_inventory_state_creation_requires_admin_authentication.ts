import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate that creating a SKU inventory state requires admin authentication.
 *
 * This test covers two complementary paths for POST
 * /shoppingMall/admin/skuInventoryStates:
 *
 * 1. Unauthenticated request must fail
 *
 *    - Use an unauthenticated connection (no Authorization header)
 *    - Send a syntactically valid IShoppingMallSkuInventoryState.ICreate payload
 *    - Expect the call to fail with an HttpError caught via TestValidator.error
 * 2. Authenticated admin request must succeed
 *
 *    - Join as an admin via POST /auth/admin/join using a valid
 *         IShoppingMallAdminJoin.ICreate payload
 *    - This populates Authorization on the main connection
 *    - Call POST /shoppingMall/admin/skuInventoryStates with the same payload
 *    - Assert that a concrete IShoppingMallSkuInventoryState entity is returned and
 *         that its core fields mirror the request body
 *
 * Business intent:
 *
 * - Inventory state configuration is reserved for platform admins
 * - The platform must reject unauthenticated attempts while allowing properly
 *   authenticated admins to create new inventory states
 */
export async function test_api_sku_inventory_state_creation_requires_admin_authentication(
  connection: api.IConnection,
) {
  // Prepare a deterministic but random-looking SKU inventory state payload
  const createBody = {
    code: `state-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  // 1. Unauthenticated request: clone connection but clear headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "creating sku inventory state without auth must fail",
    async () => {
      await api.functional.shoppingMall.admin.skuInventoryStates.create(
        unauthConnection,
        {
          body: createBody,
        },
      );
    },
  );

  // 2. Authenticated admin request: join as admin first
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // With the now-authenticated connection, creation must succeed
  const createdState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallSkuInventoryState>(createdState);

  // Business-level validations (beyond type correctness)
  TestValidator.equals(
    "created sku inventory state code matches request",
    createdState.code,
    createBody.code,
  );
  TestValidator.equals(
    "created sku inventory state name matches request",
    createdState.name,
    createBody.name,
  );
  TestValidator.equals(
    "created sku inventory state description matches request",
    createdState.description ?? null,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "created sku inventory state purchasable flag matches request",
    createdState.is_purchasable,
    createBody.is_purchasable,
  );
}
