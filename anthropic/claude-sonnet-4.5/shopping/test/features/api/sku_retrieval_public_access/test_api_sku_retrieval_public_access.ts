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
 * Test retrieving detailed SKU information through public access without
 * authentication.
 *
 * This test validates the core product browsing functionality where buyers
 * (including guests) need to view SKU details before making purchase decisions.
 * The workflow demonstrates the complete public product discovery process from
 * admin category creation, seller authentication and product setup, to
 * unauthenticated public SKU retrieval.
 *
 * Process:
 *
 * 1. Admin creates product category for sale organization
 * 2. Seller authenticates and creates product sale listing
 * 3. Seller creates SKU variant with specific attribute configuration
 * 4. Public user (unauthenticated) retrieves SKU details
 * 5. Validate complete SKU information including pricing, variant attributes, and
 *    relationships
 */
export async function test_api_sku_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create product category
  const categoryData = {
    parent_id: null,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Step 3: Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerData = {
    email: sellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    business_description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 5,
    }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 4: Create product sale listing
  const saleCode = RandomGenerator.alphaNumeric(16);
  const saleData = {
    code: saleCode,
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    brand: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 4 }),
    condition: "new" as const,
    short_description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 10,
      wordMax: 15,
    }),
    meta_keywords: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 2,
      wordMax: 4,
    }),
    weight: typia.random<number & tags.Minimum<0>>(),
    dimension_length: typia.random<number & tags.Minimum<0>>(),
    dimension_width: typia.random<number & tags.Minimum<0>>(),
    dimension_height: typia.random<number & tags.Minimum<0>>(),
    manufacturer: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 2,
      wordMax: 4,
    }),
    return_policy_days: RandomGenerator.pick([7, 14, 30, 60] as const),
    warranty_info: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 8,
      wordMax: 15,
    }),
    status: "published",
  } satisfies IShoppingMallSale.ICreate;

  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: saleData,
    });
  typia.assert(sale);

  // Step 5: Create SKU variant with variant_combination JSON
  const skuCode = RandomGenerator.alphaNumeric(12);
  const variantCombination = JSON.stringify({
    Color: "Blue",
    Size: "Large",
    Material: "Cotton",
  });

  const basePrice = typia.random<number & tags.Minimum<0>>();
  const compareAtPrice = basePrice * 1.3;
  const salePrice = basePrice * 0.85;
  const saleStartAt = new Date().toISOString();
  const saleEndAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const skuData = {
    sku_code: skuCode,
    variant_combination: variantCombination,
    base_price: basePrice,
    compare_at_price: compareAtPrice,
    sale_price: salePrice,
    sale_start_at: saleStartAt,
    sale_end_at: saleEndAt,
    cost_price: basePrice * 0.6,
    barcode: RandomGenerator.alphaNumeric(13),
    enabled: true,
  } satisfies IShoppingMallSaleSku.ICreate;

  const createdSku: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: skuData,
    });
  typia.assert(createdSku);

  // Step 6: Retrieve SKU via public endpoint WITHOUT authentication
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  const retrievedSku: IShoppingMallSaleSku =
    await api.functional.shoppingMall.sales.skus.at(unauthConnection, {
      saleCode: sale.code,
      skuCode: skuCode,
    });
  typia.assert(retrievedSku);

  // Step 7: Validate SKU details
  TestValidator.equals("SKU ID matches", retrievedSku.id, createdSku.id);
  TestValidator.equals("SKU code matches", retrievedSku.sku_code, skuCode);
  TestValidator.equals(
    "Variant combination matches",
    retrievedSku.variant_combination,
    variantCombination,
  );
  TestValidator.equals(
    "Base price matches",
    retrievedSku.base_price,
    basePrice,
  );
  TestValidator.equals(
    "Compare at price matches",
    retrievedSku.compare_at_price,
    compareAtPrice,
  );
  TestValidator.equals(
    "Sale price matches",
    retrievedSku.sale_price,
    salePrice,
  );
  TestValidator.equals(
    "Sale start time matches",
    retrievedSku.sale_start_at,
    saleStartAt,
  );
  TestValidator.equals(
    "Sale end time matches",
    retrievedSku.sale_end_at,
    saleEndAt,
  );
  TestValidator.equals(
    "Barcode matches",
    retrievedSku.barcode,
    skuData.barcode,
  );
  TestValidator.equals("Enabled status matches", retrievedSku.enabled, true);

  // Step 8: Validate sale summary information
  TestValidator.equals(
    "Sale ID in summary matches",
    retrievedSku.sale.id,
    sale.id,
  );
  TestValidator.equals(
    "Sale code in summary matches",
    retrievedSku.sale.code,
    saleCode,
  );
  TestValidator.equals(
    "Sale title in summary matches",
    retrievedSku.sale.title,
    saleData.title,
  );

  // Step 9: Validate seller information in sale summary
  TestValidator.equals(
    "Seller ID matches",
    retrievedSku.sale.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "Seller store name matches",
    retrievedSku.sale.seller.store_name,
    sellerData.store_name,
  );
  TestValidator.equals(
    "Seller email matches",
    retrievedSku.sale.seller.email,
    sellerEmail,
  );

  // Step 10: Validate category information in sale summary
  TestValidator.equals(
    "Category ID matches",
    retrievedSku.sale.category.id,
    category.id,
  );
  TestValidator.equals(
    "Category name matches",
    retrievedSku.sale.category.name,
    categoryData.name,
  );
  TestValidator.equals(
    "Category slug matches",
    retrievedSku.sale.category.slug,
    categoryData.slug,
  );

  // Step 11: Validate variant_combination is valid JSON
  const parsedVariantCombination = JSON.parse(retrievedSku.variant_combination);
  TestValidator.predicate(
    "Variant combination is valid JSON object",
    typeof parsedVariantCombination === "object",
  );
  TestValidator.equals(
    "Variant combination Color attribute",
    parsedVariantCombination.Color,
    "Blue",
  );
  TestValidator.equals(
    "Variant combination Size attribute",
    parsedVariantCombination.Size,
    "Large",
  );
  TestValidator.equals(
    "Variant combination Material attribute",
    parsedVariantCombination.Material,
    "Cotton",
  );

  // Step 12: Validate variant_values array exists
  TestValidator.predicate(
    "Variant values array exists",
    Array.isArray(retrievedSku.variant_values),
  );
}
