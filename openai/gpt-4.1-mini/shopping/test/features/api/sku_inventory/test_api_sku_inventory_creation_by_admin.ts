import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSkuInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventory";

/**
 * This E2E test function verifies the complete workflow where an admin user
 * authenticates, creates a SKU for a product identified by a specific
 * productCode, and then creates a SKU inventory record linked to that SKU. It
 * rigorously checks all response data using typia.assert for type correctness,
 * and verifies that values returned from inventory creation correspond to the
 * values originally sent.
 *
 * The test employs realistic data generation for email, full_name, sku_code,
 * price, attributes_json, and inventory quantity.
 *
 * Step-by-step:
 *
 * 1. Admin joins and authenticates via /auth/admin/join with generated email,
 *    password, and full_name.
 * 2. Creates SKU for a product with a specified example productCode, randomized
 *    sku_code, positive price, and optional JSON attributes.
 * 3. Creates SKU inventory for the newly created SKU with non-negative quantity
 *    and a valid allowed stock_status.
 * 4. Validates that created SKU inventory entity references the same SKU ID, and
 *    all fields match expected values.
 */
export async function test_api_sku_inventory_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminFullName: string = RandomGenerator.name();
  const adminPassword: string = "TestPassword123!";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
      },
    });
  typia.assert(admin);

  // 2. Create SKU for an existing product
  const productCode = "EXAMPLE-PRODUCT-01";
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();
  const skuAttributes = JSON.stringify({ color: "red", size: "M" });

  const skuCreateBody: IShoppingMallProductSku.ICreate = {
    sku_code: skuCode,
    price: skuPrice,
    attributes_json: skuAttributes,
  };

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.createSku(
      connection,
      { productCode, body: skuCreateBody },
    );
  typia.assert(sku);

  // 3. Create SKU inventory referencing the SKU
  const inventoryQuantity: number & tags.Type<"int32"> & tags.Minimum<0> =
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>();
  const stockStatusOptions = [
    "in stock",
    "out of stock",
    "backordered",
  ] as const;
  const stockStatus = RandomGenerator.pick(stockStatusOptions);

  const inventoryCreateBody: IShoppingMallSkuInventory.ICreate = {
    shopping_mall_product_sku_id: sku.id,
    quantity: inventoryQuantity,
    stock_status: stockStatus,
  };

  const inventory: IShoppingMallSkuInventory =
    await api.functional.shoppingMall.admin.skuInventories.create(connection, {
      body: inventoryCreateBody,
    });
  typia.assert(inventory);

  // 4. Assertions to validate returned inventory
  TestValidator.equals(
    "sku inventory matches sku id",
    inventory.shopping_mall_product_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "sku inventory quantity matches",
    inventory.quantity,
    inventoryQuantity,
  );
  TestValidator.equals(
    "sku inventory stock status matches",
    inventory.stock_status,
    stockStatus,
  );
}
