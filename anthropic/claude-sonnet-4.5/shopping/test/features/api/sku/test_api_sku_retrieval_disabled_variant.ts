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
 * Test retrieving a SKU variant that has enabled set to false to validate that
 * disabled variants can still be retrieved and their status is correctly
 * reflected in the response.
 *
 * This scenario validates the variant availability management system where
 * sellers may temporarily disable specific product configurations without
 * deleting them. The test verifies that disabled SKUs are retrievable through
 * the public endpoint and return complete information including the
 * enabled=false status.
 *
 * Test workflow:
 *
 * 1. Create admin account and authenticate
 * 2. Create product category for organization
 * 3. Create seller account and authenticate
 * 4. Create parent product sale listing
 * 5. Create a disabled SKU variant (enabled=false)
 * 6. Retrieve the disabled SKU and verify all attributes
 * 7. Validate that enabled=false is correctly reflected
 */
export async function test_api_sku_retrieval_disabled_variant(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
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
      ip: "192.168.1.100",
      href: "https://admin.example.com/register",
      referrer: "https://admin.example.com/home",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: "https://example.com/category-image.jpg",
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create and authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller-password-123";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      ip: "192.168.1.101",
      href: "https://seller.example.com/register",
      referrer: "https://seller.example.com/info",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create parent product sale listing
  const saleCode = RandomGenerator.alphaNumeric(12);

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.name(1),
        condition: "new",
        short_description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 8,
        }),
        meta_keywords: "product, test, disabled",
        weight: 1.5,
        dimension_length: 20.0,
        dimension_width: 15.0,
        dimension_height: 10.0,
        manufacturer: RandomGenerator.name(2),
        return_policy_days: 30,
        warranty_info: RandomGenerator.paragraph({ sentences: 2 }),
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create a disabled SKU variant (enabled=false)
  const skuCode = RandomGenerator.alphaNumeric(16);
  const variantCombination = JSON.stringify({
    Color: "Blue",
    Size: "Medium",
  });

  const createdSku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: skuCode,
        variant_combination: variantCombination,
        base_price: 99.99,
        compare_at_price: 129.99,
        sale_price: 89.99,
        sale_start_at: new Date().toISOString(),
        sale_end_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        cost_price: 50.0,
        barcode: RandomGenerator.alphaNumeric(13),
        enabled: false,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(createdSku);

  // Step 6: Retrieve the disabled SKU variant
  const retrievedSku = await api.functional.shoppingMall.sales.skus.at(
    connection,
    {
      saleCode: sale.code,
      skuCode: skuCode,
    },
  );
  typia.assert(retrievedSku);

  // Step 7: Validate that the SKU is correctly retrieved with enabled=false
  TestValidator.equals("SKU ID matches", retrievedSku.id, createdSku.id);
  TestValidator.equals("SKU code matches", retrievedSku.sku_code, skuCode);
  TestValidator.equals("Enabled status is false", retrievedSku.enabled, false);
  TestValidator.equals("Base price matches", retrievedSku.base_price, 99.99);
  TestValidator.equals(
    "Compare at price matches",
    retrievedSku.compare_at_price,
    129.99,
  );
  TestValidator.equals("Sale price matches", retrievedSku.sale_price, 89.99);
  TestValidator.equals("Cost price matches", retrievedSku.cost_price, 50.0);
  TestValidator.equals(
    "Variant combination matches",
    retrievedSku.variant_combination,
    variantCombination,
  );
  TestValidator.equals(
    "Sale ID reference matches",
    retrievedSku.shopping_mall_sale_id,
    sale.id,
  );

  // Validate that sale relationship is populated
  TestValidator.predicate(
    "Sale summary is populated",
    retrievedSku.sale !== null && retrievedSku.sale !== undefined,
  );
  TestValidator.equals(
    "Sale summary ID matches",
    retrievedSku.sale.id,
    sale.id,
  );
  TestValidator.equals(
    "Sale summary code matches",
    retrievedSku.sale.code,
    sale.code,
  );
}
