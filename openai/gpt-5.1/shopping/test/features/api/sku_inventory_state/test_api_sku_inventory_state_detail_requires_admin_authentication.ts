import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Verify that SKU inventory state detail retrieval is protected by admin
 * authentication.
 *
 * Business goal
 *
 * - Ensure that GET /shoppingMall/admin/skuInventoryStates/{skuInventoryStateId}
 *   is not accessible without a valid admin token.
 * - Confirm that with a proper admin session, the same endpoint returns the
 *   expected IShoppingMallSkuInventoryState payload.
 *
 * High level steps
 *
 * 1. Join as an admin using POST /auth/admin/join to obtain admin authorization
 *    context.
 * 2. Using that admin session, create a SKU inventory state via POST
 *    /shoppingMall/admin/skuInventoryStates and capture its id.
 * 3. Create a derivative, unauthenticated connection that has no headers to
 *    simulate a completely anonymous client.
 * 4. Attempt to fetch the created inventory state detail using the unauthenticated
 *    connection and assert that the call fails with an authorization-style HTTP
 *    error (401 or 403) using TestValidator.httpError.
 * 5. Finally, use the original authenticated admin connection to call the same
 *    endpoint and assert that it succeeds, returning a valid
 *    IShoppingMallSkuInventoryState whose id equals the created one.
 */
export async function test_api_sku_inventory_state_detail_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authenticated context (token handled by SDK).
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Keep ip undefined to let backend infer from request metadata.
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a concrete SKU inventory state using the authenticated admin context.
  const skuInventoryStateCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
    is_purchasable: true,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const createdState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: skuInventoryStateCreateBody,
      },
    );
  typia.assert(createdState);

  // 3. Build an unauthenticated connection by cloning without headers.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt unauthorized detail retrieval and expect an HTTP 401/403 style error.
  await TestValidator.httpError(
    "unauthenticated client cannot access admin SKU inventory state detail",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.skuInventoryStates.at(
        unauthenticatedConnection,
        {
          skuInventoryStateId: createdState.id,
        },
      );
    },
  );

  // 5. Confirm that the authenticated admin can fetch the same SKU inventory state.
  const fetchedState: IShoppingMallSkuInventoryState =
    await api.functional.shoppingMall.admin.skuInventoryStates.at(connection, {
      skuInventoryStateId: createdState.id,
    });
  typia.assert(fetchedState);

  TestValidator.equals(
    "authenticated admin receives the same SKU inventory state by id",
    fetchedState.id,
    createdState.id,
  );
}
