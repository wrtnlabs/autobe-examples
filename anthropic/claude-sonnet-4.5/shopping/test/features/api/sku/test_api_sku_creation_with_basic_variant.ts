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
 * E2E test for creating a SKU variant with basic variant attributes in the
 * shopping mall.
 *
 * This test validates the complete workflow from seller/admin authentication
 * through category creation, product sale creation, and finally SKU variant
 * creation with variant combination attributes.
 *
 * Workflow Steps:
 *
 * 1. Create and authenticate seller account
 * 2. Create and authenticate admin account
 * 3. Admin creates product category
 * 4. Seller creates product sale listing
 * 5. Seller creates SKU variant with variant combination JSON
 * 6. Validate SKU creation response contains all required fields and proper sale
 *    reference
 */
export async function test_api_sku_creation_with_basic_variant(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        business_description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        store_name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: RandomGenerator.pick([
          "super_admin",
          "moderator",
          "support",
        ] as const),
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 3: Admin creates product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 5,
        }),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: RandomGenerator.pick(["active", "inactive"] as const),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 4: Switch back to seller authentication and create product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        brand: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 5,
        }),
        condition: RandomGenerator.pick([
          "new",
          "refurbished",
          "used",
        ] as const),
        short_description: RandomGenerator.paragraph({
          sentences: 8,
          wordMin: 3,
          wordMax: 7,
        }),
        meta_keywords: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 2,
          wordMax: 4,
        }),
        weight: typia.random<number>(),
        dimension_length: typia.random<number>(),
        dimension_width: typia.random<number>(),
        dimension_height: typia.random<number>(),
        manufacturer: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 5,
        }),
        return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
        warranty_info: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(sale);

  // Step 5: Create SKU variant with basic variant combination
  const variantCombination = JSON.stringify({
    Color: "Red",
    Size: "Large",
  });

  const sku: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(16),
        variant_combination: variantCombination,
        base_price: typia.random<number & tags.Minimum<0>>(),
        compare_at_price: typia.random<number & tags.Minimum<0>>(),
        sale_price: typia.random<number & tags.Minimum<0>>(),
        sale_start_at: new Date().toISOString(),
        sale_end_at: new Date(Date.now() + 86400000 * 30).toISOString(),
        cost_price: typia.random<number & tags.Minimum<0>>(),
        barcode: RandomGenerator.alphaNumeric(13),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(sku);

  // Step 6: Validate SKU creation - typia.assert validates ALL type aspects
  // Only add business logic validation
  TestValidator.equals(
    "SKU sale reference matches created sale",
    sku.sale.id,
    sale.id,
  );

  // Validate variant_combination is valid JSON with expected structure
  TestValidator.predicate(
    "SKU variant_combination can be parsed as valid JSON",
    (() => {
      try {
        const parsed = JSON.parse(sku.variant_combination);
        return typeof parsed === "object" && parsed !== null;
      } catch {
        return false;
      }
    })(),
  );
}
