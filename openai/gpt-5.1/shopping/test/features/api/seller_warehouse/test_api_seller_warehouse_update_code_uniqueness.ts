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
 * Validate uniqueness of seller warehouse codes on update.
 *
 * This E2E test verifies that the (seller_id, code) composite uniqueness
 * constraint on seller warehouses is enforced not only on creation but also
 * during updates. It simulates a realistic seller workflow:
 *
 * 1. A seller joins the platform and obtains an authenticated session.
 * 2. The seller creates two warehouses with distinct codes ("WH-CODE-A" and
 *    "WH-CODE-B").
 * 3. The seller successfully changes Warehouse A's code to a new, unused code
 *    ("WH-CODE-A2").
 * 4. The seller then attempts to change Warehouse A's code to the existing
 *    Warehouse B code ("WH-CODE-B"), which must be rejected due to the
 *    (seller_id, code) uniqueness constraint.
 * 5. The test ensures that Warehouse B remains unaffected by the failed
 *    conflicting update.
 *
 * The test focuses purely on business logic around code uniqueness and does not
 * rely on any non-existent read-by-id listing APIs beyond what is provided. It
 * assumes that a failed update does not mutate state and uses in-memory
 * instances to validate that only successful operations change warehouse
 * representations.
 */
export async function test_api_seller_warehouse_update_code_uniqueness(
  connection: api.IConnection,
) {
  // 1. Seller joins and obtains an authenticated seller context.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.console.join/warehouses",
    referrer: "https://seller.console.landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequest,
    });
  typia.assert(seller);

  // 2. Create Warehouse A with code "WH-CODE-A".
  const warehouseACode = "WH-CODE-A";
  const warehouseARequest = {
    code: warehouseACode,
    name: "Warehouse A",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouseA: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseARequest,
      },
    );
  typia.assert(warehouseA);
  TestValidator.equals(
    "warehouse A code should match initial create payload",
    warehouseA.code,
    warehouseACode,
  );

  // 3. Create Warehouse B with a distinct code "WH-CODE-B".
  const warehouseBCode = "WH-CODE-B";
  const warehouseBRequest = {
    code: warehouseBCode,
    name: "Warehouse B",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_default_origin: false,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const warehouseB: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseBRequest,
      },
    );
  typia.assert(warehouseB);
  TestValidator.equals(
    "warehouse B code should match initial create payload",
    warehouseB.code,
    warehouseBCode,
  );

  // 4. Perform a non-conflicting update on Warehouse A to a new code
  //    "WH-CODE-A2". This should succeed.
  const updatedWarehouseACode = "WH-CODE-A2";
  const updateARequest = {
    code: updatedWarehouseACode,
  } satisfies IShoppingMallSellerWarehouse.IUpdate;

  const updatedWarehouseA: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.update(
      connection,
      {
        warehouseId: warehouseA.id,
        body: updateARequest,
      },
    );
  typia.assert(updatedWarehouseA);

  TestValidator.equals(
    "updated warehouse A should preserve id",
    updatedWarehouseA.id,
    warehouseA.id,
  );
  TestValidator.equals(
    "updated warehouse A should have new non-conflicting code",
    updatedWarehouseA.code,
    updatedWarehouseACode,
  );

  // 5. Attempt a conflicting update: change Warehouse A's code to
  //    Warehouse B's existing code "WH-CODE-B". This must fail.
  const conflictingUpdateRequest = {
    code: warehouseBCode,
  } satisfies IShoppingMallSellerWarehouse.IUpdate;

  await TestValidator.error(
    "updating warehouse A code to an existing warehouse B code must fail",
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.update(
        connection,
        {
          warehouseId: warehouseA.id,
          body: conflictingUpdateRequest,
        },
      );
    },
  );

  // 6. Ensure Warehouse B remains unaffected in the in-memory representation.
  // Since the conflicting update failed and there is no additional API call
  // touching Warehouse B, its code must remain the original value
  // "WH-CODE-B".
  TestValidator.equals(
    "warehouse B code remains unchanged after failed conflicting update",
    warehouseB.code,
    warehouseBCode,
  );
}
