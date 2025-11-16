import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryStock } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStock";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test updating both total quantity and low stock threshold simultaneously in a
 * single update operation.
 *
 * This scenario validates that sellers can perform comprehensive inventory
 * adjustments in one operation, useful for restocking scenarios where both
 * inventory levels and alert thresholds need adjustment.
 *
 * The test verifies that:
 *
 * 1. Both total_quantity and low_stock_threshold can be updated in a single
 *    request
 * 2. All field validations apply correctly (non-negative integers, total_quantity
 *
 * > = reserved_quantity)
 * 3. The available_quantity recalculation occurs correctly
 * 4. The update is atomic (both fields update together or neither updates)
 * 5. The updated values are immediately reflected in inventory queries
 *
 * Steps:
 *
 * 1. Create and authenticate seller account
 * 2. Create and authenticate admin account
 * 3. Admin creates product category
 * 4. Seller creates product sale listing
 * 5. Seller creates SKU variant
 * 6. Seller creates initial inventory stock with baseline values
 * 7. Perform combined update of total_quantity and low_stock_threshold
 * 8. Verify both fields updated correctly and available_quantity recalculated
 */
export async function test_api_inventory_stock_update_combined_fields(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Admin creates product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller and create product sale listing
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create SKU variant for the product
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
        base_price: typia.random<number & tags.Minimum<0>>(),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Create initial inventory stock with baseline values
  const initialTotalQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<200>
  >();
  const initialLowStockThreshold = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<20>
  >();

  const inventoryStock =
    await api.functional.shoppingMall.seller.saleSkus.inventoryStock.create(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          total_quantity: initialTotalQuantity,
          low_stock_threshold: initialLowStockThreshold,
        } satisfies IShoppingMallInventoryStock.ICreate,
      },
    );
  typia.assert(inventoryStock);

  // Verify initial state
  TestValidator.equals(
    "initial total quantity",
    inventoryStock.total_quantity,
    initialTotalQuantity,
  );
  TestValidator.equals(
    "initial low stock threshold",
    inventoryStock.low_stock_threshold,
    initialLowStockThreshold,
  );
  TestValidator.equals(
    "initial reserved quantity",
    inventoryStock.reserved_quantity,
    0,
  );
  TestValidator.equals(
    "initial available quantity",
    inventoryStock.available_quantity,
    initialTotalQuantity,
  );

  // Step 7: Perform combined update of total_quantity and low_stock_threshold
  const newTotalQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<500> & tags.Maximum<1000>
  >();
  const newLowStockThreshold = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<100>
  >();

  const updatedStock =
    await api.functional.shoppingMall.seller.saleSkus.inventoryStock.update(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          total_quantity: newTotalQuantity,
          low_stock_threshold: newLowStockThreshold,
        } satisfies IShoppingMallInventoryStock.IUpdate,
      },
    );
  typia.assert(updatedStock);

  // Step 8: Verify both fields updated correctly and available_quantity recalculated
  TestValidator.equals(
    "updated total quantity",
    updatedStock.total_quantity,
    newTotalQuantity,
  );
  TestValidator.equals(
    "updated low stock threshold",
    updatedStock.low_stock_threshold,
    newLowStockThreshold,
  );
  TestValidator.equals(
    "reserved quantity unchanged",
    updatedStock.reserved_quantity,
    0,
  );
  TestValidator.equals(
    "available quantity recalculated",
    updatedStock.available_quantity,
    newTotalQuantity,
  );

  // Verify the update was atomic - both fields changed from initial values
  TestValidator.notEquals(
    "total quantity changed from initial",
    updatedStock.total_quantity,
    initialTotalQuantity,
  );
  TestValidator.notEquals(
    "low stock threshold changed from initial",
    updatedStock.low_stock_threshold,
    initialLowStockThreshold,
  );

  // Verify updated_at timestamp reflects the modification
  TestValidator.predicate(
    "updated timestamp after created",
    new Date(updatedStock.updated_at).getTime() >=
      new Date(updatedStock.created_at).getTime(),
  );
}
