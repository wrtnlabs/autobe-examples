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
 * Validate that deleting a seller warehouse address when no address exists
 * results in a controlled error without affecting the warehouse header.
 *
 * Business context:
 *
 * - Sellers can configure warehouses as physical or logical inventory locations.
 * - Address information for a warehouse is stored separately in the seller
 *   warehouse address table.
 * - Calling DELETE /shoppingMall/seller/sellerWarehouses/{warehouseId}/address
 *   for a warehouse that has no address row should not corrupt or delete the
 *   warehouse itself; instead it should fail gracefully.
 *
 * Test flow:
 *
 * 1. Register a seller via /auth/seller/join to obtain an authenticated seller
 *    context (token handled automatically by SDK).
 * 2. Create a new warehouse via /shoppingMall/seller/sellerWarehouses with a
 *    simple, valid IShoppingMallSellerWarehouse.ICreate payload.
 *
 *    - This warehouse starts with no associated address row.
 * 3. Attempt to delete the address of this warehouse via
 *    /shoppingMall/seller/sellerWarehouses/{warehouseId}/address.
 * 4. Assert that the delete call fails in a controlled way using
 *    TestValidator.error, without asserting a specific HTTP status code.
 *
 * Notes and constraints:
 *
 * - We do not have a GET warehouse endpoint in the provided SDK, so we cannot
 *   re-fetch the warehouse to prove it still exists. Instead, we focus on
 *   ensuring that the delete operation throws an HttpError rather than
 *   succeeding silently.
 * - We must not assert on specific HTTP status codes, only on the fact that an
 *   error is thrown for this invalid business operation.
 * - All requests must be fully type-safe, with DTO bodies built using `satisfies`
 *   and no `any`-based casting.
 */
export async function test_api_seller_warehouse_address_delete_without_existing_address(
  connection: api.IConnection,
) {
  // 1. Register a seller and obtain authenticated seller context
  const joinRequest = typia.random<IShoppingMallSellerAuthJoin.IRequest>();

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequest,
    });
  typia.assert(authorizedSeller);

  // 2. Create a new warehouse for this seller (no address is created)
  const createWarehouseBody =
    typia.random<IShoppingMallSellerWarehouse.ICreate>();

  const warehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: createWarehouseBody,
      },
    );
  typia.assert(warehouse);

  // 3. Attempt to delete an address for this warehouse where none exists
  await TestValidator.error(
    "delete warehouse address when none exists should fail",
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.address.erase(
        connection,
        {
          warehouseId: warehouse.id,
        },
      );
    },
  );
}
