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
 * Test SKU creation with complete promotional pricing configuration including
 * base price, compare-at price, sale price, and time-bound promotional
 * windows.
 *
 * This test validates the full promotional pricing model where SKUs support:
 *
 * - Regular base pricing for standard sales
 * - Compare-at pricing for discount display to buyers
 * - Time-bound sale pricing with start/end timestamps
 * - Internal cost tracking for profit margin analysis
 *
 * Workflow:
 *
 * 1. Authenticate as seller to manage products
 * 2. Admin creates category for product organization
 * 3. Seller creates parent product sale listing
 * 4. Create SKU with full promotional pricing structure
 * 5. Validate all pricing fields and constraints
 */
export async function test_api_sku_creation_with_promotional_pricing(
  connection: api.IConnection,
) {
  // Step 1: Seller registration and authentication
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

  // Step 2: Admin creates category (switch to admin context)
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

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(1),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Switch back to seller and create product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

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
        short_description: RandomGenerator.paragraph({ sentences: 5 }),
        meta_keywords: RandomGenerator.paragraph({ sentences: 4 }),
        weight: typia.random<number>(),
        dimension_length: typia.random<number>(),
        dimension_width: typia.random<number>(),
        dimension_height: typia.random<number>(),
        manufacturer: RandomGenerator.name(2),
        return_policy_days: 30 as const,
        warranty_info: RandomGenerator.paragraph({ sentences: 5 }),
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 4: Create SKU with full promotional pricing configuration
  const basePrice = 99.99;
  const compareAtPrice = 149.99;
  const salePrice = 79.99;
  const costPrice = 45.5;

  const now = new Date();
  const saleStartAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const saleEndAt = new Date(saleStartAt.getTime() + 7 * 24 * 60 * 60 * 1000);

  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
        variant_combination: JSON.stringify({
          Color: "Red",
          Size: "Large",
        }),
        base_price: basePrice,
        compare_at_price: compareAtPrice,
        sale_price: salePrice,
        sale_start_at: saleStartAt.toISOString(),
        sale_end_at: saleEndAt.toISOString(),
        cost_price: costPrice,
        barcode: RandomGenerator.alphaNumeric(13),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 5: Validate all pricing fields and constraints
  TestValidator.equals("base price matches input", sku.base_price, basePrice);

  TestValidator.equals(
    "compare-at price matches input",
    sku.compare_at_price,
    compareAtPrice,
  );

  TestValidator.equals("sale price matches input", sku.sale_price, salePrice);

  TestValidator.equals("cost price matches input", sku.cost_price, costPrice);

  TestValidator.predicate(
    "sale price is less than base price",
    (sku.sale_price ?? 0) < sku.base_price,
  );

  TestValidator.predicate(
    "compare-at price is greater than or equal to base price",
    (sku.compare_at_price ?? 0) >= sku.base_price,
  );

  TestValidator.equals(
    "sale start timestamp is set",
    sku.sale_start_at,
    saleStartAt.toISOString(),
  );

  TestValidator.equals(
    "sale end timestamp is set",
    sku.sale_end_at,
    saleEndAt.toISOString(),
  );

  TestValidator.predicate(
    "sale start is before sale end",
    new Date(sku.sale_start_at ?? 0).getTime() <
      new Date(sku.sale_end_at ?? 0).getTime(),
  );

  TestValidator.predicate("SKU is enabled for purchase", sku.enabled === true);

  TestValidator.equals(
    "variant combination is properly stored",
    sku.variant_combination,
    JSON.stringify({ Color: "Red", Size: "Large" }),
  );
}
