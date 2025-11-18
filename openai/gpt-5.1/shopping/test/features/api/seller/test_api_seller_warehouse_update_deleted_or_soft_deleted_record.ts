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
 * Validate update behavior for seller warehouses before and after deletion.
 *
 * Business goal: Ensure that a seller can successfully update a warehouse they
 * own, but once that warehouse has been erased via the seller erase endpoint,
 * subsequent update attempts using the same warehouseId must fail with an
 * error. This aligns with the general business rule that logically or
 * physically removed warehouses are no longer mutable through seller-facing
 * configuration APIs.
 *
 * Scenario steps:
 *
 * 1. Join as a seller using /auth/seller/join so that the connection is
 *    authenticated as a seller (join will set the Authorization header).
 * 2. Create a warehouse with /shoppingMall/seller/sellerWarehouses using a valid
 *    IShoppingMallSellerWarehouse.ICreate payload.
 * 3. Update that warehouse once with PUT
 *    /shoppingMall/seller/sellerWarehouses/{warehouseId} using an
 *    IShoppingMallSellerWarehouse.IUpdate payload, and verify that selected
 *    fields (e.g., name, code, is_default_origin, status) are changed as
 *    expected in the response.
 * 4. Erase the same warehouse via DELETE
 *    /shoppingMall/seller/sellerWarehouses/{warehouseId}.
 * 5. Attempt to update the erased warehouse again with PUT
 *    /shoppingMall/seller/sellerWarehouses/{warehouseId}. We expect this call
 *    to fail (for example, because the warehouse no longer exists or is no
 *    longer updatable). Use TestValidator.error with an async closure around
 *    the update call to assert that an error is thrown, without checking the
 *    specific HTTP status code.
 *
 * What this test verifies:
 *
 * - The seller join flow works and yields an authorized seller context.
 * - A seller can create and then update their own warehouse successfully.
 * - After a warehouse has been erased through the seller erase API, further
 *   update attempts for that warehouse id result in an error, ensuring that
 *   deleted records are not silently updatable.
 */
export async function test_api_seller_warehouse_update_deleted_or_soft_deleted_record(
  connection: api.IConnection,
) {
  // 1. Join as a seller to obtain an authenticated context (Authorization is
  //    set on the connection automatically by the join() call).
  const joinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create a warehouse for this seller.
  const createBody = typia.random<IShoppingMallSellerWarehouse.ICreate>();
  const createdWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallSellerWarehouse>(createdWarehouse);

  // 3. Update the warehouse once and verify that fields change appropriately.
  const updateBody: IShoppingMallSellerWarehouse.IUpdate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_default_origin: !createdWarehouse.is_default_origin,
    status: createdWarehouse.status === "active" ? "inactive" : "active",
  };

  const updatedWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.update(
      connection,
      {
        warehouseId: createdWarehouse.id,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(updatedWarehouse);

  // Basic business validations on the successful update.
  TestValidator.equals(
    "updated warehouse id remains the same",
    updatedWarehouse.id,
    createdWarehouse.id,
  );
  TestValidator.equals(
    "warehouse name should be updated",
    updatedWarehouse.name,
    updateBody.name ?? createdWarehouse.name,
  );
  TestValidator.equals(
    "warehouse description should reflect latest value",
    updatedWarehouse.description ?? null,
    updateBody.description ?? createdWarehouse.description ?? null,
  );
  TestValidator.equals(
    "is_default_origin should reflect update payload when provided",
    updatedWarehouse.is_default_origin,
    updateBody.is_default_origin ?? createdWarehouse.is_default_origin,
  );
  TestValidator.equals(
    "status should reflect update payload when provided",
    updatedWarehouse.status,
    updateBody.status ?? createdWarehouse.status,
  );

  // 4. Erase the warehouse.
  await api.functional.shoppingMall.seller.sellerWarehouses.erase(connection, {
    warehouseId: createdWarehouse.id,
  });

  // 5. Attempt to update the erased warehouse again; this must now fail.
  await TestValidator.error(
    "updating an erased warehouse must fail",
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.update(
        connection,
        {
          warehouseId: createdWarehouse.id,
          body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
          },
        },
      );
    },
  );
}
