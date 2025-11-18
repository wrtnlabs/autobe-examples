import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";

/**
 * Validate that deleting a seller warehouse that is configured as the seller's
 * default origin is blocked by business rules.
 *
 * Business context:
 *
 * - Sellers manage one or more warehouses that represent physical or logical
 *   inventory and shipment origin locations.
 * - At most one warehouse per seller can have `is_default_origin = true`.
 * - The platform enforces safety rules so that a default-origin warehouse cannot
 *   be deleted while still configured as the default origin, to avoid breaking
 *   inventory/fulfilment flows.
 *
 * Test workflow:
 *
 * 1. Register a new seller via `api.functional.auth.seller.join`, which also
 *    configures the connection with the seller's Authorization header.
 * 2. Create a seller warehouse via
 *    `api.functional.shoppingMall.seller.sellerWarehouses.create` with
 *    `is_default_origin = true` and a valid `status` (e.g. "active").
 * 3. Assert that the returned warehouse object passes `typia.assert` and that
 *    `is_default_origin` is indeed `true`.
 * 4. Attempt to delete this same warehouse via
 *    `api.functional.shoppingMall.seller.sellerWarehouses.erase`.
 * 5. Use `await TestValidator.error` to assert that the erase operation fails for
 *    this default-origin warehouse (business rule violation). We deliberately
 *    avoid asserting specific HTTP status codes and instead only assert that an
 *    error is thrown.
 * 6. Because no list/detail endpoint for warehouses is provided in the current
 *    SDK, we cannot re-fetch the warehouse to confirm existence, so we limit
 *    our post-conditions to the fact that deletion raised an error.
 */
export async function test_api_seller_warehouse_delete_blocks_default_origin(
  connection: api.IConnection,
) {
  // 1. Register a new seller to obtain an authenticated seller context.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create a default-origin warehouse for this seller.
  const warehouseCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const defaultWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(defaultWarehouse);

  TestValidator.predicate(
    "created warehouse must be marked as default origin",
    defaultWarehouse.is_default_origin === true,
  );

  // 3. Attempt to erase the default-origin warehouse and expect an error.
  await TestValidator.error(
    "deleting a default-origin warehouse must fail with business rule error",
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.erase(
        connection,
        {
          warehouseId: defaultWarehouse.id,
        },
      );
    },
  );
}
