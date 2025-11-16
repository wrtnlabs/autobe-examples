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
 * Test inventory stock retrieval for a product SKU variant.
 *
 * This test validates the complete inventory tracking workflow from product
 * creation through SKU variant setup to inventory stock retrieval, ensuring
 * sellers can access accurate real-time stock levels for checkout validation
 * and inventory management.
 *
 * Workflow:
 *
 * 1. Admin creates product category for organization
 * 2. Seller registers and creates product sale listing
 * 3. Seller creates SKU variant with specific attributes
 * 4. Seller initializes inventory stock tracking with defined quantities
 * 5. Seller retrieves inventory stock record
 * 6. Validate stock levels: total_quantity, reserved_quantity, available_quantity
 * 7. Verify available_quantity = total_quantity - reserved_quantity
 * 8. Confirm low_stock_threshold and timestamps are accurate
 */
export async function test_api_inventory_stock_retrieval_for_sku(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication and category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(8),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 2: Seller authentication and product sale creation
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Create product sale listing
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: RandomGenerator.name(1),
        condition: "new" as const,
        short_description: RandomGenerator.paragraph({ sentences: 2 }),
        meta_keywords: RandomGenerator.paragraph({ sentences: 5 }),
        weight: typia.random<number>() * 10,
        dimension_length: typia.random<number>() * 50,
        dimension_width: typia.random<number>() * 50,
        dimension_height: typia.random<number>() * 50,
        manufacturer: RandomGenerator.name(2),
        return_policy_days: 30 as const,
        warranty_info: RandomGenerator.paragraph({ sentences: 4 }),
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 3: Create SKU variant with specific variant attributes
  const variantCombination = {
    Color: "Blue",
    Size: "Large",
  };

  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: `${sale.code}-BLUE-L`,
        variant_combination: JSON.stringify(variantCombination),
        base_price: 99.99,
        compare_at_price: 129.99,
        sale_price: 89.99,
        sale_start_at: new Date().toISOString(),
        sale_end_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        cost_price: 50.0,
        barcode: RandomGenerator.alphaNumeric(13),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 4: Initialize inventory stock tracking with defined quantities
  const initialTotalQuantity = 100;
  const lowStockThreshold = 10;

  const createdStock =
    await api.functional.shoppingMall.seller.saleSkus.inventoryStock.create(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          total_quantity: initialTotalQuantity,
          low_stock_threshold: lowStockThreshold,
        } satisfies IShoppingMallInventoryStock.ICreate,
      },
    );
  typia.assert(createdStock);

  // Step 5: Retrieve the inventory stock record for the SKU
  const retrievedStock =
    await api.functional.shoppingMall.seller.saleSkus.inventoryStock.at(
      connection,
      {
        saleSkuId: sku.id,
      },
    );
  typia.assert(retrievedStock);

  // Step 6: Validate inventory stock fields
  TestValidator.equals(
    "inventory stock ID should match created stock",
    retrievedStock.id,
    createdStock.id,
  );

  TestValidator.equals(
    "inventory stock should reference correct SKU",
    retrievedStock.shopping_mall_sale_sku_id,
    sku.id,
  );

  TestValidator.equals(
    "total quantity should match initialized value",
    retrievedStock.total_quantity,
    initialTotalQuantity,
  );

  TestValidator.equals(
    "reserved quantity should be zero initially",
    retrievedStock.reserved_quantity,
    0,
  );

  // Step 7: Verify available_quantity = total_quantity - reserved_quantity
  const expectedAvailableQuantity =
    retrievedStock.total_quantity - retrievedStock.reserved_quantity;
  TestValidator.equals(
    "available quantity should equal total minus reserved",
    retrievedStock.available_quantity,
    expectedAvailableQuantity,
  );

  TestValidator.equals(
    "available quantity should equal total quantity when no reservations",
    retrievedStock.available_quantity,
    initialTotalQuantity,
  );

  // Step 8: Validate low stock threshold configuration
  TestValidator.equals(
    "low stock threshold should match configured value",
    retrievedStock.low_stock_threshold,
    lowStockThreshold,
  );

  // Step 9: Validate business logic constraints
  TestValidator.predicate(
    "available quantity should be non-negative",
    retrievedStock.available_quantity >= 0,
  );

  TestValidator.predicate(
    "reserved quantity should not exceed total quantity",
    retrievedStock.reserved_quantity <= retrievedStock.total_quantity,
  );
}
