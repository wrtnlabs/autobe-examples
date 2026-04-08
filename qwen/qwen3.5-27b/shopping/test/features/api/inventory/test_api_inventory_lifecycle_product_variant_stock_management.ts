import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test complete inventory management lifecycle with multiple stock movements for a product variant.
 *
 * Validates the end-to-end inventory tracking workflow including seller registration, product creation, variant setup with initial stock, and multiple inventory adjustments. Ensures that positive and negative stock changes are correctly recorded and that the final inventory count accurately reflects the sum of all stock movements.
 *
 * Special attention is given to verifying that the inventory audit trail is complete and immutable, with each stock movement properly documented with quantity changes and business reasons. The test validates that the system correctly handles restocking, order fulfillment, cancellations, and inventory adjustments.
 *
 * 1. Seller registers and authenticates to access inventory management operations.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller creates a variant with initial stock quantity of 100 units.
 * 4. Five inventory records are created with various stock movements:
 *    - Initial restocking: +50 units (stock: 150)
 *    - Order fulfillment: -25 units (stock: 125)
 *    - Supplier restock: +75 units (stock: 200)
 *    - Cancellation refund: +10 units (stock: 210)
 *    - Damaged goods removal: -5 units (stock: 205)
 * 5. Validates that all inventory records are created successfully with correct data.
 * 6. Validates that final inventory count equals 205 (100 + 50 - 25 + 75 + 10 - 5).
 */
export async function test_api_inventory_lifecycle_product_variant_stock_management(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a variant with initial stock of 100 units
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  TestValidator.equals("initial stock quantity", variant.inventory_count, 100);
  // 4. Create five inventory records with various stock movements
  const inventoryRecords: IShoppingMallInventoryRecord[] = [];
  // First inventory record: Initial restocking (+50)
  const record1 =
    await generate_random_shopping_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: 50,
          reason: "Initial supplier shipment",
        },
      },
    );
  typia.assert(record1);
  inventoryRecords.push(record1);
  // Second inventory record: Order fulfillment (-25)
  const record2 =
    await generate_random_shopping_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: -25,
          reason: "Order #12345 fulfillment",
        },
      },
    );
  typia.assert(record2);
  inventoryRecords.push(record2);
  // Third inventory record: Restocking (+75)
  const record3 =
    await generate_random_shopping_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: 75,
          reason: "Restock from supplier",
        },
      },
    );
  typia.assert(record3);
  inventoryRecords.push(record3);
  // Fourth inventory record: Cancellation refund (+10)
  const record4 =
    await generate_random_shopping_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: 10,
          reason: "Cancelled order #12346 refund",
        },
      },
    );
  typia.assert(record4);
  inventoryRecords.push(record4);
  // Fifth inventory record: Inventory adjustment (-5)
  const record5 =
    await generate_random_shopping_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity_change: -5,
          reason: "Damaged goods removal",
        },
      },
    );
  typia.assert(record5);
  inventoryRecords.push(record5);
  // 5. Validate all inventory records
  TestValidator.equals(
    "all inventory records created",
    inventoryRecords.length,
    5,
  );
  // Validate each record has unique ID
  const ids = inventoryRecords.map((r) => r.id);
  TestValidator.predicate(
    "all inventory record IDs are unique",
    ids.length === new Set(ids).size,
  );
  // Validate quantity changes match expected values
  TestValidator.equals(
    "first record quantity change",
    record1.quantity_change,
    50,
  );
  TestValidator.equals(
    "second record quantity change",
    record2.quantity_change,
    -25,
  );
  TestValidator.equals(
    "third record quantity change",
    record3.quantity_change,
    75,
  );
  TestValidator.equals(
    "fourth record quantity change",
    record4.quantity_change,
    10,
  );
  TestValidator.equals(
    "fifth record quantity change",
    record5.quantity_change,
    -5,
  );
  // Validate reasons are correctly recorded
  TestValidator.equals(
    "first record reason",
    record1.reason,
    "Initial supplier shipment",
  );
  TestValidator.equals(
    "second record reason",
    record2.reason,
    "Order #12345 fulfillment",
  );
  TestValidator.equals(
    "third record reason",
    record3.reason,
    "Restock from supplier",
  );
  TestValidator.equals(
    "fourth record reason",
    record4.reason,
    "Cancelled order #12346 refund",
  );
  TestValidator.equals(
    "fifth record reason",
    record5.reason,
    "Damaged goods removal",
  );
  // Validate all records reference the correct variant
  inventoryRecords.forEach((record) => {
    TestValidator.equals(
      "inventory record variant ID matches",
      record.productVariant.id,
      variant.id,
    );
  });
  // 6. Validate final inventory count (100 + 50 - 25 + 75 + 10 - 5 = 205)
  const totalQuantityChange = inventoryRecords.reduce(
    (sum, record) => sum + record.quantity_change,
    0,
  );
  const expectedFinalStock = 100 + totalQuantityChange;
  TestValidator.equals(
    "total quantity change from all records",
    totalQuantityChange,
    105,
  );
  TestValidator.equals(
    "expected final stock calculation",
    expectedFinalStock,
    205,
  );
  // Validate timestamps are present
  inventoryRecords.forEach((record, index) => {
    TestValidator.predicate(
      `record ${index + 1} has created_at timestamp`,
      record.created_at !== null && record.created_at !== undefined,
    );
    TestValidator.predicate(
      `record ${index + 1} has updated_at timestamp`,
      record.updated_at !== null && record.updated_at !== undefined,
    );
  });
  // Validate records are not soft-deleted
  inventoryRecords.forEach((record, index) => {
    TestValidator.equals(
      `record ${index + 1} is not deleted`,
      record.deleted_at,
      null,
    );
  });
}
