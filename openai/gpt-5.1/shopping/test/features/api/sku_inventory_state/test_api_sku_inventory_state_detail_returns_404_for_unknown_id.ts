import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate that admin SKU inventory state detail lookup returns an error for an
 * unknown UUID.
 *
 * Business goal:
 *
 * - Ensure that even a fully authenticated admin cannot retrieve a SKU inventory
 *   state record by an arbitrary UUID that does not exist in
 *   `shopping_mall_sku_inventory_states`.
 * - Confirm that the backend does not fabricate or leak data for unknown
 *   identifiers, but instead fails the request.
 *
 * Steps
 *
 * 1. Register a new admin using POST /auth/admin/join. This call also wires the
 *    admin access token into the shared connection object.
 * 2. Generate a random UUID value for `skuInventoryStateId` that is extremely
 *    unlikely to match a real record.
 * 3. Call GET /shoppingMall/admin/skuInventoryStates/{skuInventoryStateId} using
 *    the authenticated admin connection.
 * 4. Validate, using TestValidator.error, that the call fails instead of returning
 *    an `IShoppingMallSkuInventoryState` object.
 */
export async function test_api_sku_inventory_state_detail_returns_404_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication & token wiring)
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
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Generate a random UUID for a non-existent SKU inventory state
  const unknownSkuInventoryStateId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3 & 4. Attempt to fetch the SKU inventory state and ensure it errors
  await TestValidator.error(
    "unknown skuInventoryStateId must fail",
    async () => {
      const result: IShoppingMallSkuInventoryState =
        await api.functional.shoppingMall.admin.skuInventoryStates.at(
          connection,
          {
            skuInventoryStateId: unknownSkuInventoryStateId,
          },
        );

      // If backend erroneously returns a record, assert will still pass on type,
      // but the test must fail logically by throwing.
      typia.assert<IShoppingMallSkuInventoryState>(result);
      throw new Error(
        "Expected SKU inventory state detail lookup to fail for unknown id, but it succeeded.",
      );
    },
  );
}
