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
 * Test updating SKU variant information after inventory restocking.
 *
 * This test simulates a seller restocking inventory and updating SKU metadata
 * accordingly, including modifications to barcode information and enabled
 * status. The test verifies that sellers can update barcode identifiers for
 * warehouse integration, toggle SKU availability status, and that these changes
 * are properly persisted without affecting other SKU properties like pricing or
 * variant combinations.
 *
 * Test Flow:
 *
 * 1. Create seller account and authenticate
 * 2. Create admin account and authenticate
 * 3. Admin creates product category
 * 4. Switch back to seller authentication
 * 5. Seller creates product sale listing
 * 6. Seller creates initial SKU variant
 * 7. Seller updates SKU with new barcode and enabled status (restock scenario)
 * 8. Validate that barcode and enabled status are updated correctly
 * 9. Validate that core properties remain unchanged
 */
export async function test_api_sku_update_inventory_restock(
  connection: api.IConnection,
) {
  // 1. Create seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // 2. Create admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
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
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // 3. Admin creates product category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 4. Switch back to seller authentication
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerData.email,
      password: sellerData.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 5. Seller creates product sale listing
  const saleData = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    condition: RandomGenerator.pick(["new", "refurbished", "used"] as const),
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    meta_keywords: RandomGenerator.paragraph({ sentences: 3 }),
    weight: typia.random<number>(),
    dimension_length: typia.random<number>(),
    dimension_width: typia.random<number>(),
    dimension_height: typia.random<number>(),
    manufacturer: RandomGenerator.name(2),
    return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
    warranty_info: RandomGenerator.paragraph({ sentences: 5 }),
    status: "draft",
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleData,
    },
  );
  typia.assert(sale);

  // 6. Seller creates initial SKU variant
  const initialSkuData = {
    sku_code: RandomGenerator.alphaNumeric(10),
    variant_combination: JSON.stringify({ color: "red", size: "M" }),
    base_price: typia.random<number & tags.Minimum<0>>(),
    compare_at_price: typia.random<number & tags.Minimum<0>>(),
    sale_price: typia.random<number & tags.Minimum<0>>(),
    sale_start_at: new Date().toISOString(),
    sale_end_at: new Date(Date.now() + 86400000 * 7).toISOString(),
    cost_price: typia.random<number & tags.Minimum<0>>(),
    barcode: RandomGenerator.alphaNumeric(13),
    enabled: true,
  } satisfies IShoppingMallSaleSku.ICreate;

  const createdSku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: initialSkuData,
    },
  );
  typia.assert(createdSku);

  // 7. Seller updates SKU with new barcode and enabled status (restock scenario)
  const newBarcode = RandomGenerator.alphaNumeric(13);
  const newEnabledStatus = false;

  const updateData = {
    barcode: newBarcode,
    enabled: newEnabledStatus,
  } satisfies IShoppingMallSaleSku.IUpdate;

  const updatedSku = await api.functional.shoppingMall.seller.sales.skus.update(
    connection,
    {
      saleCode: sale.code,
      skuCode: createdSku.sku_code,
      body: updateData,
    },
  );
  typia.assert(updatedSku);

  // 8. Validate that barcode and enabled status are updated correctly
  TestValidator.equals(
    "barcode should be updated to new value",
    updatedSku.barcode,
    newBarcode,
  );
  TestValidator.equals(
    "enabled status should be toggled to false",
    updatedSku.enabled,
    newEnabledStatus,
  );

  // 9. Validate that core immutable properties remain unchanged
  TestValidator.equals(
    "sku_code should remain unchanged",
    updatedSku.sku_code,
    createdSku.sku_code,
  );
  TestValidator.equals(
    "variant_combination should remain unchanged",
    updatedSku.variant_combination,
    createdSku.variant_combination,
  );
  TestValidator.equals(
    "base_price should remain unchanged",
    updatedSku.base_price,
    createdSku.base_price,
  );
}
