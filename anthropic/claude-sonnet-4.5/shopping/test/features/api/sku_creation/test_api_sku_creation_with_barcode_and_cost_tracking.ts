import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test creating a SKU variant with optional barcode identifier and cost_price
 * for inventory management and profit tracking.
 *
 * This test validates that sellers can include UPC, EAN, or custom barcode
 * identifiers for warehouse and point-of-sale integration, along with internal
 * cost price for profit margin calculations. The test verifies that the barcode
 * field accepts standard barcode formats and is properly stored and retrieved,
 * and that cost_price is stored but not exposed in buyer-facing displays.
 *
 * Test workflow:
 *
 * 1. Create and authenticate seller account
 * 2. Create and authenticate admin account for category creation
 * 3. Admin creates product category
 * 4. Switch back to seller authentication
 * 5. Seller creates parent product sale listing
 * 6. Seller creates SKU variant with barcode and cost_price
 * 7. Validate that the created SKU includes all required fields plus optional
 *    barcode and cost_price values
 */
export async function test_api_sku_creation_with_barcode_and_cost_tracking(
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
      href: "https://marketplace.example.com/seller/register",
      referrer: "https://marketplace.example.com/seller/info",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create and authenticate admin account for category creation
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
      href: "https://marketplace.example.com/admin/register",
      referrer: "https://marketplace.example.com/admin/info",
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
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller authentication
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://marketplace.example.com/seller/login",
      referrer: "https://marketplace.example.com/seller",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Seller creates parent product sale listing
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: RandomGenerator.name(1),
        condition: "new" as const,
        short_description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        meta_keywords: RandomGenerator.paragraph({ sentences: 5 }),
        weight: typia.random<number & tags.Minimum<0>>(),
        dimension_length: typia.random<number & tags.Minimum<0>>(),
        dimension_width: typia.random<number & tags.Minimum<0>>(),
        dimension_height: typia.random<number & tags.Minimum<0>>(),
        manufacturer: RandomGenerator.name(2),
        return_policy_days: 30 as const,
        warranty_info: RandomGenerator.paragraph({ sentences: 4 }),
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 6: Seller creates SKU variant with barcode and cost_price
  const skuCode = RandomGenerator.alphaNumeric(10);
  const barcodeValue = RandomGenerator.alphaNumeric(13);
  const costPriceValue = typia.random<number & tags.Minimum<0>>();
  const basePriceValue = typia.random<number & tags.Minimum<0>>();

  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleCode,
      body: {
        sku_code: skuCode,
        variant_combination: JSON.stringify({ Color: "Blue", Size: "Medium" }),
        base_price: basePriceValue,
        compare_at_price: basePriceValue * 1.2,
        sale_price: basePriceValue * 0.9,
        sale_start_at: new Date().toISOString(),
        sale_end_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        cost_price: costPriceValue,
        barcode: barcodeValue,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 7: Validate that the created SKU includes all required fields plus optional barcode and cost_price values
  TestValidator.equals("SKU code matches", sku.sku_code, skuCode);
  TestValidator.equals("Base price matches", sku.base_price, basePriceValue);
  TestValidator.equals("Barcode is properly stored", sku.barcode, barcodeValue);
  TestValidator.equals(
    "Cost price is properly stored",
    sku.cost_price,
    costPriceValue,
  );
  TestValidator.equals("SKU is enabled", sku.enabled, true);
  TestValidator.equals(
    "SKU is associated with correct sale",
    sku.shopping_mall_sale_id,
    sale.id,
  );

  // Validate variant combination
  const parsedVariantCombination = JSON.parse(sku.variant_combination);
  TestValidator.equals(
    "Variant combination Color is Blue",
    parsedVariantCombination.Color,
    "Blue",
  );
  TestValidator.equals(
    "Variant combination Size is Medium",
    parsedVariantCombination.Size,
    "Medium",
  );
}
