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
 * Verify that a seller cannot delete another seller's warehouse.
 *
 * Business rule: seller-owned warehouses are tenant-isolated; only the owning
 * seller (or elevated actors not covered here) may erase a warehouse. This test
 * ensures that when Seller B attempts to delete a warehouse created by Seller
 * A, the platform rejects the operation.
 *
 * Scenario steps:
 *
 * 1. Register Seller A using /auth/seller/join and obtain authenticated context
 *    (token is applied to the connection by the SDK).
 * 2. As Seller A, create Warehouse A using /shoppingMall/seller/sellerWarehouses
 *    and capture its generated id.
 * 3. Register Seller B with a second /auth/seller/join call, which switches the
 *    connection's Authorization header to Seller B.
 * 4. As Seller B, call DELETE /shoppingMall/seller/sellerWarehouses/{warehouseId}
 *    targeting Warehouse A's id.
 * 5. Assert that the erase call fails (throws) via TestValidator.error, proving
 *    cross-tenant deletion is forbidden.
 * 6. We do not re-check Warehouse A's existence because no read/list endpoint is
 *    provided in the current materials; we just ensure the unauthorized attempt
 *    results in an error.
 */
export async function test_api_seller_warehouse_delete_rejects_other_seller_warehouse(
  connection: api.IConnection,
) {
  // 1. Register Seller A (join)
  const sellerAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller-a.example.com/onboarding",
    referrer: "https://seller-a.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerA);

  // 2. As Seller A, create Warehouse A
  const warehouseCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouseA: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseCreateBody,
      },
    );
  typia.assert(warehouseA);

  // 3. Register Seller B, which changes the authenticated seller on this connection
  const sellerBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller-b.example.com/onboarding",
    referrer: "https://seller-b.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerB);

  // Sanity check that Seller A and B are distinct principals
  TestValidator.notEquals(
    "seller A and seller B must be different accounts",
    sellerA.id,
    sellerB.id,
  );

  // 4 & 5. As Seller B, attempt to erase Seller A's warehouse and expect an error
  await TestValidator.error(
    "seller B must not be able to erase seller A's warehouse",
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.erase(
        connection,
        {
          warehouseId: warehouseA.id,
        },
      );
    },
  );
}
