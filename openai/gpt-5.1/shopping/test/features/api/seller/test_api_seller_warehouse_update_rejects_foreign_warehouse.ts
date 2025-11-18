import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";

export async function test_api_seller_warehouse_update_rejects_foreign_warehouse(
  connection: api.IConnection,
) {
  // 1. Register Seller A and create a warehouse under Seller A
  const sellerAJoinRequest =
    typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerA);

  const warehouseCreateBody =
    typia.random<IShoppingMallSellerWarehouse.ICreate>();
  const warehouseA: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(warehouseA);

  // 2. Capture baseline values for later comparison
  const originalWarehouseId = warehouseA.id;
  const originalCode = warehouseA.code;
  const originalName = warehouseA.name;
  const originalDescription = warehouseA.description ?? null;
  const originalIsDefaultOrigin = warehouseA.is_default_origin;
  const originalStatus = warehouseA.status;

  // 3. Register Seller B (connection Authorization now points to Seller B)
  const sellerBJoinRequest =
    typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerB);

  // 4. Attempt to update Seller A's warehouse as Seller B - must fail
  const sellerBAttemptUpdateBody: IShoppingMallSellerWarehouse.IUpdate = {
    name: `${originalName}-HACKED-B`,
    status: `${originalStatus}-by-B`,
    is_default_origin: !originalIsDefaultOrigin,
    description:
      originalDescription !== null
        ? `${originalDescription}-mutated-by-B`
        : "description-from-B",
  };

  await TestValidator.error(
    "seller B cannot update warehouse owned by seller A",
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.update(
        connection,
        {
          warehouseId: originalWarehouseId,
          body: sellerBAttemptUpdateBody,
        },
      );
    },
  );

  // 5. Re-establish Seller A context by joining again (new Seller A prime)
  const sellerA2JoinRequest =
    typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const sellerA2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerA2JoinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerA2);

  // 6. Perform a legitimate update as Seller A on the same warehouse
  const sellerAUpdateBody: IShoppingMallSellerWarehouse.IUpdate = {
    name: `${originalName}-updated-by-A`,
    description:
      originalDescription !== null
        ? `${originalDescription}-updated-by-A`
        : "description-from-A",
    status: `${originalStatus}-by-A`,
    is_default_origin: originalIsDefaultOrigin,
  };

  const updatedWarehouseA: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.update(
      connection,
      {
        warehouseId: originalWarehouseId,
        body: sellerAUpdateBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(updatedWarehouseA);

  // 7. Business assertions: only Seller A's update should be reflected
  TestValidator.equals(
    "warehouse id must remain unchanged",
    updatedWarehouseA.id,
    originalWarehouseId,
  );

  TestValidator.equals(
    "code must remain unchanged despite Seller B attempt",
    updatedWarehouseA.code,
    originalCode,
  );

  TestValidator.equals(
    "name must reflect Seller A's update, not Seller B's attempt",
    updatedWarehouseA.name,
    sellerAUpdateBody.name,
  );

  TestValidator.equals(
    "description must reflect Seller A's update, not Seller B's attempt",
    updatedWarehouseA.description ?? null,
    sellerAUpdateBody.description ?? null,
  );

  TestValidator.equals(
    "status must reflect Seller A's update, not Seller B's attempt",
    updatedWarehouseA.status,
    sellerAUpdateBody.status,
  );

  TestValidator.equals(
    "is_default_origin must follow Seller A's decision",
    updatedWarehouseA.is_default_origin,
    sellerAUpdateBody.is_default_origin,
  );
}
