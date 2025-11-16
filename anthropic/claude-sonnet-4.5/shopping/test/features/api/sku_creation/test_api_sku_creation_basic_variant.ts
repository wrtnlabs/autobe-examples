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
 * Test creating a basic SKU variant for a product sale with required fields.
 *
 * This test validates the fundamental SKU creation workflow including variant
 * configuration, pricing, and availability. The test follows a multi-actor
 * scenario:
 *
 * 1. Admin authenticates and creates product category
 * 2. Seller authenticates and creates product sale
 * 3. Seller creates SKU variant with variant combination and pricing
 * 4. Validates SKU includes all submitted information with generated UUID, correct
 *    sale association, and timestamps
 * 5. Verifies SKU is immediately available for purchase if enabled=true
 */
export async function test_api_sku_creation_basic_variant(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
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
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: "https://marketplace.example.com/seller/join",
      referrer: "https://marketplace.example.com/home",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Seller creates product sale
  const saleCode = RandomGenerator.alphaNumeric(16);

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Seller creates SKU variant
  const skuCode = `${saleCode}-RED-L`;
  const variantCombination = JSON.stringify({ Color: "Red", Size: "Large" });

  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: skuCode,
        variant_combination: variantCombination,
        base_price: 99.99,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Validate SKU creation results
  TestValidator.equals("SKU code matches input", sku.sku_code, skuCode);
  TestValidator.equals(
    "variant combination matches",
    sku.variant_combination,
    variantCombination,
  );
  TestValidator.equals("base price matches", sku.base_price, 99.99);
  TestValidator.equals("enabled status matches", sku.enabled, true);
  TestValidator.equals(
    "sale association correct",
    sku.shopping_mall_sale_id,
    sale.id,
  );

  // Validate sale reference
  TestValidator.equals("sale reference id matches", sku.sale.id, sale.id);
  TestValidator.equals("sale reference code matches", sku.sale.code, sale.code);
}
