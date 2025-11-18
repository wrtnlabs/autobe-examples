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
 * Validate warehouse code uniqueness per seller.
 *
 * Business rule:
 *
 * - Each seller has a composite unique constraint (seller_id, code) on
 *   warehouses.
 * - Same seller cannot create two warehouses with the same code.
 * - Different sellers can reuse the same warehouse code independently.
 *
 * Test workflow:
 *
 * 1. Register Seller A via /auth/seller/join and establish authenticated seller
 *    context.
 * 2. As Seller A, create a warehouse with code "WH-UNIQUE" using
 *    /shoppingMall/seller/sellerWarehouses (ICreate DTO).
 *
 *    - Verify creation succeeds and returned warehouse matches request data.
 * 3. Using the same authenticated Seller A connection, attempt to create another
 *    warehouse with the SAME code "WH-UNIQUE" but different name.
 *
 *    - Expect API to reject with a business-validation/conflict error due to
 *         (seller_id, code) uniqueness.
 *    - Use TestValidator.error to assert that an error is thrown (no status code
 *         inspection).
 * 4. Register Seller B via /auth/seller/join, which mutates connection headers to
 *    use Seller B token.
 * 5. As Seller B, create a warehouse with the SAME code "WH-UNIQUE".
 *
 *    - Verify creation succeeds and code is identical, proving uniqueness is scoped
 *         per seller.
 */
export async function test_api_seller_warehouse_creation_code_uniqueness_per_seller(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerARequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://seller-portal.example.com/join",
    referrer: "https://landing.example.com/seller",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerARequest,
    });
  typia.assert(sellerA);

  const warehouseCode = "WH-UNIQUE";

  // 2. Seller A creates first warehouse with code "WH-UNIQUE"
  const sellerAWarehouseCreateBody = {
    code: warehouseCode,
    name: "Seller A Main Warehouse",
    description: null,
    is_default_origin: false,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const sellerAWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      { body: sellerAWarehouseCreateBody },
    );
  typia.assert(sellerAWarehouse);

  // Basic business assertions for first creation
  TestValidator.equals(
    "first warehouse code must match request",
    sellerAWarehouse.code,
    sellerAWarehouseCreateBody.code,
  );
  TestValidator.equals(
    "first warehouse name must match request",
    sellerAWarehouse.name,
    sellerAWarehouseCreateBody.name,
  );
  TestValidator.equals(
    "first warehouse status must match request",
    sellerAWarehouse.status,
    sellerAWarehouseCreateBody.status,
  );
  TestValidator.equals(
    "first warehouse default-origin flag must match request",
    sellerAWarehouse.is_default_origin,
    sellerAWarehouseCreateBody.is_default_origin,
  );

  // 3. Attempt duplicate code for same seller A
  const duplicateWarehouseCreateBody = {
    code: warehouseCode, // same code as first warehouse
    name: "Seller A Secondary Warehouse with Duplicate Code",
    description: null,
    is_default_origin: false,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  await TestValidator.error(
    "duplicate warehouse code for same seller must fail",
    async () => {
      await api.functional.shoppingMall.seller.sellerWarehouses.create(
        connection,
        { body: duplicateWarehouseCreateBody },
      );
    },
  );

  // 4. Register Seller B (mutates connection headers to new seller context)
  const sellerBRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://seller-portal.example.com/join",
    referrer: "https://landing.example.com/seller",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBRequest,
    });
  typia.assert(sellerB);

  // 5. Seller B creates warehouse with same code "WH-UNIQUE"
  const sellerBWarehouseCreateBody = {
    code: warehouseCode, // same code, different seller
    name: "Seller B Main Warehouse",
    description: null,
    is_default_origin: false,
    status: "active",
  } satisfies IShoppingMallSellerWarehouse.ICreate;

  const sellerBWarehouse: IShoppingMallSellerWarehouse =
    await api.functional.shoppingMall.seller.sellerWarehouses.create(
      connection,
      { body: sellerBWarehouseCreateBody },
    );
  typia.assert(sellerBWarehouse);

  TestValidator.equals(
    "second seller warehouse code must match shared code",
    sellerBWarehouse.code,
    warehouseCode,
  );

  // Cross-seller code reuse semantics: same code but different warehouse IDs
  TestValidator.notEquals(
    "warehouses created by different sellers with same code must have different IDs",
    sellerAWarehouse.id,
    sellerBWarehouse.id,
  );
}
