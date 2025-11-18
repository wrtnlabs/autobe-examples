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
 * Validate that seller warehouse detail reflects the latest updates.
 *
 * Business flow:
 *
 * 1. Seller self-registers via /auth/seller/join and becomes authenticated.
 * 2. Seller creates a warehouse via /shoppingMall/seller/sellerWarehouses.
 * 3. Capture baseline warehouse fields from the creation response.
 * 4. Seller updates mutable fields of that warehouse via PUT .../{warehouseId}.
 * 5. Seller fetches warehouse detail via GET .../{warehouseId}.
 * 6. Verify that the detail response reflects the updated business fields while
 *    preserving immutable identity fields and advancing updated_at.
 */
export async function test_api_seller_warehouse_detail_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Seller joins (auth) using IShoppingMallSellerAuthJoin.IRequest
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedSeller);

  // 2. Create initial warehouse with deterministic business values
  const createBody = {
    code: "WH-SEOUL-01",
    name: "Seoul Main Warehouse",
    description: null,
    is_default_origin: true,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const createdWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdWarehouse);

  // Preserve baseline identity and timestamps
  const originalId = createdWarehouse.id;
  const originalCreatedAt = createdWarehouse.created_at;
  const originalUpdatedAt = createdWarehouse.updated_at;

  // 3. Prepare update payload changing multiple mutable fields
  const updateBody = {
    name: "Seoul Main Warehouse - Updated",
    description: "Updated description for Seoul main warehouse.",
    is_default_origin: false,
    status: "inactive",
  } satisfies IShoppingMallSellerWarehouse.IUpdate;

  const updatedWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.update(
      connection,
      {
        warehouseId: createdWarehouse.id,
        body: updateBody,
      },
    );
  typia.assert(updatedWarehouse);

  // 4. Fetch detail after update
  const detailWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.at(connection, {
      warehouseId: createdWarehouse.id,
    });
  typia.assert(detailWarehouse);

  // 5. Validate identity consistency
  TestValidator.equals(
    "warehouse id should remain unchanged after update",
    detailWarehouse.id,
    originalId,
  );
  TestValidator.equals(
    "created_at should remain unchanged after update",
    detailWarehouse.created_at,
    originalCreatedAt,
  );

  // 6. Validate business field updates reflected in detail
  TestValidator.equals(
    "warehouse name should match updated value",
    detailWarehouse.name,
    updateBody.name,
  );
  TestValidator.equals(
    "warehouse description should match updated value",
    detailWarehouse.description,
    updateBody.description,
  );
  TestValidator.equals(
    "is_default_origin flag should match updated value",
    detailWarehouse.is_default_origin,
    updateBody.is_default_origin,
  );
  TestValidator.equals(
    "status should match updated value",
    detailWarehouse.status,
    updateBody.status,
  );

  // 7. updated_at must advance after update
  const originalUpdatedMillis = new Date(originalUpdatedAt).getTime();
  const detailUpdatedMillis = new Date(detailWarehouse.updated_at).getTime();

  TestValidator.predicate(
    "updated_at should be greater than the original updated_at after update",
    () => detailUpdatedMillis > originalUpdatedMillis,
  );

  // 8. At least one mutable field should differ from the originally created warehouse
  TestValidator.notEquals(
    "name should differ between created and updated warehouse",
    createdWarehouse.name,
    detailWarehouse.name,
  );
}
