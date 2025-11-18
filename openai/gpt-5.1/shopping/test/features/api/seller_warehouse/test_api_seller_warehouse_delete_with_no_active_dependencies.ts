import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";

export async function test_api_seller_warehouse_delete_with_no_active_dependencies(
  connection: api.IConnection,
) {
  // 1. Register a fresh seller and obtain authorized context
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create a new non-default, active-status warehouse for this seller
  const warehouseCodeBase = RandomGenerator.alphaNumeric(12);
  const warehouseCreateBody = {
    code: warehouseCodeBase,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default_origin: false,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const createdWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: warehouseCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(createdWarehouse);

  // Basic field validations to ensure creation echoed our configuration
  TestValidator.equals(
    "created warehouse code should match request",
    createdWarehouse.code,
    warehouseCreateBody.code,
  );
  TestValidator.equals(
    "created warehouse name should match request",
    createdWarehouse.name,
    warehouseCreateBody.name,
  );
  TestValidator.equals(
    "created warehouse status should match request",
    createdWarehouse.status,
    warehouseCreateBody.status,
  );
  TestValidator.equals(
    "created warehouse is_default_origin should be false",
    createdWarehouse.is_default_origin,
    warehouseCreateBody.is_default_origin,
  );

  // 3. Delete the created warehouse
  await api.functional.shoppingMall.seller.sellerWarehouses.erase(connection, {
    warehouseId: createdWarehouse.id,
  });

  // 4. Verify deletion effect by ensuring a second delete fails
  await TestValidator.error(
    "second delete on same warehouseId should fail after initial erase",
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.erase(
        connection,
        {
          warehouseId: createdWarehouse.id,
        },
      );
    },
  );
}
