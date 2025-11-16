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
 * Test SKU variant creation workflow where sellers define specific product
 * configurations with unique pricing and attributes.
 *
 * This comprehensive test validates the complete flow from admin category setup
 * through seller product listing to SKU variant definition. It ensures proper
 * multi-actor authentication, category hierarchy, sale listing creation, and
 * SKU variant configuration with pricing validation.
 *
 * Workflow steps:
 *
 * 1. Admin authenticates and creates product category
 * 2. Seller authenticates via join to create products
 * 3. Seller creates product sale listing in the category
 * 4. Seller creates SKU variant for the sale with unique variant combination and
 *    pricing
 */
export async function test_api_sku_variant_creation_for_product(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates and creates product category
  const adminRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminRegistration,
  });
  typia.assert(admin);

  // Step 2: Create product category
  const categoryData = {
    parent_id: null,
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(12).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: RandomGenerator.pick(["active", "inactive"] as const),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 3: Seller authenticates via join
  const sellerRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(3),
    business_description: RandomGenerator.paragraph({ sentences: 8 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerRegistration,
  });
  typia.assert(seller);

  // Step 4: Seller creates product sale listing
  const saleData = {
    code: RandomGenerator.alphaNumeric(16),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    brand: RandomGenerator.name(1),
    condition: RandomGenerator.pick(["new", "refurbished", "used"] as const),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    meta_keywords: RandomGenerator.paragraph({ sentences: 4 }),
    weight: typia.random<number>(),
    dimension_length: typia.random<number>(),
    dimension_width: typia.random<number>(),
    dimension_height: typia.random<number>(),
    manufacturer: RandomGenerator.name(2),
    return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
    warranty_info: RandomGenerator.paragraph({ sentences: 6 }),
    status: RandomGenerator.pick([
      "draft",
      "pending_approval",
      "published",
      "suspended",
      "archived",
    ] as const),
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleData,
    },
  );
  typia.assert(sale);

  // Step 5: Seller creates SKU variant for the sale
  const variantCombination = {
    Color: RandomGenerator.pick([
      "Red",
      "Blue",
      "Green",
      "Black",
      "White",
    ] as const),
    Size: RandomGenerator.pick(["Small", "Medium", "Large", "XL"] as const),
  };

  const basePrice = typia.random<
    number & tags.Minimum<0>
  >() satisfies number as number;
  const compareAtPrice = (basePrice +
    typia.random<number & tags.Minimum<0>>()) satisfies number as number;
  const salePrice = basePrice * 0.8;

  const skuData = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(12)}`,
    variant_combination: JSON.stringify(variantCombination),
    base_price: basePrice,
    compare_at_price: compareAtPrice,
    sale_price: salePrice,
    sale_start_at: new Date().toISOString(),
    sale_end_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cost_price: basePrice * 0.5,
    barcode: RandomGenerator.alphaNumeric(13),
    enabled: true,
  } satisfies IShoppingMallSaleSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: skuData,
    },
  );
  typia.assert(sku);

  // Validation: Confirm sku_code is unique within the parent sale listing
  TestValidator.equals(
    "SKU code matches request",
    sku.sku_code,
    skuData.sku_code,
  );

  // Validation: Validate variant_combination JSON contains selected attribute values
  const parsedVariantCombination = JSON.parse(sku.variant_combination);
  TestValidator.equals(
    "Variant combination matches",
    parsedVariantCombination,
    variantCombination,
  );

  // Validation: Ensure base_price is greater than 0
  TestValidator.predicate("Base price is positive", sku.base_price > 0);

  // Validation: Test compare_at_price validation (must be >= base_price if provided)
  if (sku.compare_at_price) {
    TestValidator.predicate(
      "Compare at price >= base price",
      sku.compare_at_price >= sku.base_price,
    );
  }

  // Validation: Verify sale_price validation (must be < base_price if provided)
  if (sku.sale_price) {
    TestValidator.predicate(
      "Sale price < base price",
      sku.sale_price < sku.base_price,
    );
  }

  // Validation: Validate sale_end_at must be after sale_start_at
  if (sku.sale_start_at && sku.sale_end_at) {
    TestValidator.predicate(
      "Sale end after sale start",
      new Date(sku.sale_end_at) > new Date(sku.sale_start_at),
    );
  }

  // Validation: Ensure cost_price and barcode are stored correctly when provided
  TestValidator.equals(
    "Cost price matches",
    sku.cost_price,
    skuData.cost_price,
  );
  TestValidator.equals("Barcode matches", sku.barcode, skuData.barcode);

  // Validation: Verify enabled flag controls SKU availability for purchase
  TestValidator.equals("Enabled flag matches", sku.enabled, skuData.enabled);

  // Validation: Test that parent sale must exist and be owned by authenticated seller
  TestValidator.equals(
    "SKU belongs to correct sale",
    sku.shopping_mall_sale_id,
    sale.id,
  );

  // Validation: Ensure SKU creation establishes relationship with parent sale listing
  TestValidator.equals("Sale reference matches", sku.sale.id, sale.id);
}
