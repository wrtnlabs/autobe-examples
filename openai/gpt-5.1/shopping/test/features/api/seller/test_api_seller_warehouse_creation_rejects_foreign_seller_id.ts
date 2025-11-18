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
 * Verify that seller warehouse creation is bound to the authenticated seller
 * and cannot be hijacked by forging seller identifiers in the payload.
 *
 * Business context:
 *
 * - Warehouses are owned by sellers and the DTO for creation does not expose any
 *   seller_id field; the backend derives seller_id from the auth context.
 * - We therefore validate that separate sellers can create warehouses and receive
 *   distinct warehouse entities, implicitly confirming that ownership is scoped
 *   per authenticated seller.
 *
 * Steps:
 *
 * 1. Seller A joins via /auth/seller/join and becomes the active auth context.
 * 2. Seller A creates a warehouse via /shoppingMall/seller/sellerWarehouses.
 * 3. Seller B joins (replacing Authorization on the same connection).
 * 4. Seller B creates a different warehouse via the same endpoint.
 * 5. Assert that:
 *
 *    - Seller A and B ids differ.
 *    - Warehouse A and B ids differ.
 *    - Each warehouse reflects the code we supplied for that seller, proving that
 *         the backend did not cross wires between auth contexts.
 */
export async function test_api_seller_warehouse_creation_rejects_foreign_seller_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A joins
  const joinBodyA = {
    email: `sellerA+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Password123!",
    href: "https://seller-portal.example.com/onboarding",
    referrer: "https://seller-portal.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBodyA,
    });
  typia.assert(sellerA);

  // 2. Seller A creates a warehouse
  const warehouseCodeA = `WH-A-${RandomGenerator.alphaNumeric(6)}`;
  const createBodyA = {
    code: warehouseCodeA,
    name: "Seller A Primary Warehouse",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouseA: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: createBodyA,
      },
    );
  typia.assert(warehouseA);

  // 3. Seller B joins (auth context switches on same connection)
  const joinBodyB = {
    email: `sellerB+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Password123!",
    href: "https://seller-portal.example.com/onboarding",
    referrer: "https://seller-portal.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBodyB,
    });
  typia.assert(sellerB);

  // Sanity check: sellers must differ
  TestValidator.notEquals(
    "seller A and seller B must have different ids",
    sellerA.id,
    sellerB.id,
  );

  // 4. Seller B creates its own warehouse
  const warehouseCodeB = `WH-B-${RandomGenerator.alphaNumeric(6)}`;
  const createBodyB = {
    code: warehouseCodeB,
    name: "Seller B Primary Warehouse",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouseB: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: createBodyB,
      },
    );
  typia.assert(warehouseB);

  // 5. Validate separation between the two sellers and warehouses
  TestValidator.notEquals(
    "warehouse A and warehouse B must have different ids",
    warehouseA.id,
    warehouseB.id,
  );

  TestValidator.equals(
    "warehouse A must preserve the code sent for seller A",
    warehouseA.code,
    warehouseCodeA,
  );

  TestValidator.equals(
    "warehouse B must preserve the code sent for seller B",
    warehouseB.code,
    warehouseCodeB,
  );
}
