import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerWarehouse";

export async function test_api_seller_warehouse_creation_with_description_and_non_default(
  connection: api.IConnection,
) {
  // 1. Register a new seller via /auth/seller/join
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller);

  // 2. Create a new warehouse with non-empty description and is_default_origin=false
  const warehouseDescription =
    "Handles all return shipments for Korea" as string;

  const createWarehouseBody = {
    code: "WH-SEOUL-RETURNS",
    name: "Seoul Returns Center",
    description: warehouseDescription,
    is_default_origin: false,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const createdWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: createWarehouseBody,
      },
    );
  typia.assert<IShoppingMallSellerWarehouse>(createdWarehouse);

  // 3. Validate created warehouse fields
  TestValidator.equals(
    "warehouse code should match the requested code",
    createdWarehouse.code,
    createWarehouseBody.code,
  );
  TestValidator.equals(
    "warehouse name should match the requested name",
    createdWarehouse.name,
    createWarehouseBody.name,
  );
  TestValidator.equals(
    "warehouse description should match the requested description",
    createdWarehouse.description,
    createWarehouseBody.description,
  );
  TestValidator.equals(
    "warehouse default origin flag should be false",
    createdWarehouse.is_default_origin,
    createWarehouseBody.is_default_origin,
  );
  TestValidator.equals(
    "warehouse status should match the requested status",
    createdWarehouse.status,
    createWarehouseBody.status,
  );

  // Ensure the warehouse is not soft-deleted at creation time
  TestValidator.predicate(
    "created warehouse should not be soft-deleted (deleted_at is null or undefined)",
    createdWarehouse.deleted_at === null ||
      createdWarehouse.deleted_at === undefined,
  );

  // 4. Retrieval step via GET /shoppingMall/seller/sellerWarehouses/{warehouseId}
  //    is not available in the provided SDK, so we treat the creation response
  //    as the source of truth for persisted data in this test.
}
