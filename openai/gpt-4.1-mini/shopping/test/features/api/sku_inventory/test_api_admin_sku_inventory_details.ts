import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSkuInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventory";

/**
 * Validate the retrieval of detailed SKU inventory information for admin users.
 *
 * This test simulates the complete workflow for SKU inventory details
 * retrieval:
 *
 * 1. Admin user registration and authentication
 * 2. Product creation with unique product code
 * 3. SKU variant creation for the product
 * 4. SKU inventory creation for the SKU
 * 5. Retrieval of the SKU inventory details by inventory ID
 * 6. Validation that retrieved inventory matches created data
 *
 * The test verifies the positive flow of authorized access, proper data
 * linkage, and API response correctness, ensuring all entities properly connect
 * and data integrity is maintained.
 */
export async function test_api_admin_sku_inventory_details(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin-password123",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Product creation with unique product code
  const productCode = `PRD-${RandomGenerator.alphaNumeric(8)}`;
  const productName = RandomGenerator.name(3);
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        code: productCode,
        name: productName,
        description: RandomGenerator.paragraph({ sentences: 4 }),
        brand: "Test Brand",
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 3. SKU variant creation for the product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const skuPrice = 10000;
  const skuAttributes = JSON.stringify({ color: "red", size: "M" });
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.admin.products.skus.createSku(
      connection,
      {
        productCode: productCode,
        body: {
          sku_code: skuCode,
          price: skuPrice,
          attributes_json: skuAttributes,
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(sku);

  // 4. SKU inventory creation for the SKU
  const inventoryQuantity = 50;
  const inventoryStockStatus: "in stock" = "in stock";
  const inventory: IShoppingMallSkuInventory =
    await api.functional.shoppingMall.admin.skuInventories.create(connection, {
      body: {
        shopping_mall_product_sku_id: sku.id,
        quantity: inventoryQuantity,
        stock_status: inventoryStockStatus,
      } satisfies IShoppingMallSkuInventory.ICreate,
    });
  typia.assert(inventory);

  // 5. Retrieval of the SKU inventory details by inventory ID
  const fetchedInventory: IShoppingMallSkuInventory =
    await api.functional.shoppingMall.admin.skuInventories.at(connection, {
      id: inventory.id,
    });
  typia.assert(fetchedInventory);

  // 6. Validation that retrieved inventory matches created data
  TestValidator.equals(
    "Inventory ID matches",
    fetchedInventory.id,
    inventory.id,
  );
  TestValidator.equals(
    "SKU ID matches",
    fetchedInventory.shopping_mall_product_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "Quantity matches",
    fetchedInventory.quantity,
    inventoryQuantity,
  );
  TestValidator.equals(
    "Stock status matches",
    fetchedInventory.stock_status,
    inventoryStockStatus,
  );
}
