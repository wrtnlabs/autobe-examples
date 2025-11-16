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
 * Test SKU creation with promotional sale pricing including time-bounded
 * discounts.
 *
 * This test validates that sellers can configure temporary promotional pricing
 * with start and end timestamps for product SKU variants.
 *
 * Workflow:
 *
 * 1. Admin authenticates and creates product category
 * 2. Seller authenticates and creates product sale listing
 * 3. Seller creates SKU variant with promotional sale pricing
 * 4. Validate pricing structure supports both regular and promotional pricing
 *
 * Validations:
 *
 * - SKU created with base_price as regular selling price
 * - Sale_price is less than base_price for valid discount
 * - Sale_start_at timestamp provided when sale_price is set
 * - Sale_end_at timestamp provided and is after sale_start_at
 * - Compare_at_price can be set to show original MSRP
 * - Promotional pricing parameters work correctly
 */
export async function test_api_sku_promotional_pricing_configuration(
  connection: api.IConnection,
) {
  // Step 1: Admin joins and authenticates
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
      ip: "127.0.0.1",
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/home",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Admin creates product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
        parent_id: null,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Seller joins and authenticates
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
      ip: "192.168.1.1",
      href: "https://marketplace.example.com/seller/register",
      referrer: "https://marketplace.example.com/seller/info",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Seller creates product sale listing
  const saleCode = RandomGenerator.alphaNumeric(12);

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        brand: RandomGenerator.name(1),
        condition: "new",
        short_description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 8,
        }),
        meta_keywords: `${RandomGenerator.name(1)}, ${RandomGenerator.name(1)}, ${RandomGenerator.name(1)}`,
        weight: typia.random<number & tags.Minimum<0>>(),
        dimension_length: typia.random<number & tags.Minimum<0>>(),
        dimension_width: typia.random<number & tags.Minimum<0>>(),
        dimension_height: typia.random<number & tags.Minimum<0>>(),
        manufacturer: RandomGenerator.name(2),
        return_policy_days: RandomGenerator.pick([7, 14, 30, 60] as const),
        warranty_info: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 10,
        }),
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Seller creates SKU with promotional pricing
  const basePrice = 99.99;
  const salePrice = 79.99;
  const compareAtPrice = 129.99;

  const now = new Date();
  const saleStartAt = new Date(
    now.getTime() + 1000 * 60 * 60 * 24,
  ).toISOString();
  const saleEndAt = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString();

  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: `${saleCode}-${RandomGenerator.alphaNumeric(6)}`,
        variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
        base_price: basePrice,
        compare_at_price: compareAtPrice,
        sale_price: salePrice,
        sale_start_at: saleStartAt,
        sale_end_at: saleEndAt,
        cost_price: 50.0,
        barcode: RandomGenerator.alphaNumeric(13),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Validate promotional pricing configuration
  TestValidator.equals(
    "base price is set correctly",
    sku.base_price,
    basePrice,
  );
  TestValidator.equals(
    "sale price is set correctly",
    sku.sale_price,
    salePrice,
  );
  TestValidator.equals(
    "compare at price is set correctly",
    sku.compare_at_price,
    compareAtPrice,
  );
  TestValidator.equals(
    "sale start timestamp is set correctly",
    sku.sale_start_at,
    saleStartAt,
  );
  TestValidator.equals(
    "sale end timestamp is set correctly",
    sku.sale_end_at,
    saleEndAt,
  );

  // Validate sale_price is less than base_price
  TestValidator.predicate(
    "sale price is less than base price",
    (sku.sale_price ?? 0) < sku.base_price,
  );

  // Validate sale_end_at is after sale_start_at
  if (sku.sale_start_at && sku.sale_end_at) {
    TestValidator.predicate(
      "sale end time is after sale start time",
      new Date(sku.sale_end_at).getTime() >
        new Date(sku.sale_start_at).getTime(),
    );
  }

  // Validate SKU is enabled and properly configured
  TestValidator.equals("SKU is enabled", sku.enabled, true);
  TestValidator.equals(
    "SKU belongs to correct sale",
    sku.shopping_mall_sale_id,
    sale.id,
  );
}
