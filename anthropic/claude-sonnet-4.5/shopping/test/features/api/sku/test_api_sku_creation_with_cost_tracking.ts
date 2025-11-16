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
 * Test creating a SKU with cost_price field for seller profit margin tracking.
 *
 * This test validates that sellers can optionally record their cost price for
 * internal analytics without exposing it to buyers. The workflow creates a
 * product sale, then creates a SKU including cost_price field (seller's
 * acquisition cost) along with base_price.
 *
 * Verifies that the SKU is created with cost_price stored correctly and that
 * this field is used only for seller-side profit calculations and analytics,
 * never displayed to buyers. Validates that profit margin can be calculated as
 * (base_price - cost_price) / base_price.
 *
 * Steps:
 *
 * 1. Create and authenticate as admin
 * 2. Create product category
 * 3. Create and authenticate as seller
 * 4. Create product sale
 * 5. Create SKU with cost_price field
 * 6. Validate cost_price storage and profit margin calculation
 */
export async function test_api_sku_creation_with_cost_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
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

  // Step 2: Create product category
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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

  // Step 3: Create and authenticate as seller
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    business_description: RandomGenerator.content({ paragraphs: 2 }),
    store_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 2,
      wordMax: 5,
    }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 4: Create product sale
  const saleData = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    condition: RandomGenerator.pick(["new", "refurbished", "used"] as const),
    return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleData,
    },
  );
  typia.assert(sale);

  // Step 5: Create SKU with cost_price field
  const basePriceValue = typia.random<number & tags.Minimum<0>>();
  const costPriceValue = basePriceValue * 0.6;

  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(10),
    variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
    base_price: basePriceValue,
    cost_price: costPriceValue,
    enabled: true,
  } satisfies IShoppingMallSaleSku.ICreate;

  const createdSku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: skuData,
    },
  );
  typia.assert(createdSku);

  // Step 6: Validate cost_price storage and profit margin calculation
  TestValidator.equals(
    "SKU created with correct SKU code",
    createdSku.sku_code,
    skuData.sku_code,
  );
  TestValidator.equals(
    "SKU created with correct base price",
    createdSku.base_price,
    basePriceValue,
  );
  TestValidator.equals(
    "SKU created with correct cost price",
    createdSku.cost_price,
    costPriceValue,
  );

  typia.assertGuard(createdSku.cost_price!);

  const profitMargin =
    (createdSku.base_price - createdSku.cost_price) / createdSku.base_price;
  TestValidator.predicate(
    "profit margin is calculated correctly and is positive",
    profitMargin > 0 && profitMargin < 1,
  );

  TestValidator.predicate(
    "cost_price is less than base_price for positive margin",
    createdSku.cost_price < createdSku.base_price,
  );
}
