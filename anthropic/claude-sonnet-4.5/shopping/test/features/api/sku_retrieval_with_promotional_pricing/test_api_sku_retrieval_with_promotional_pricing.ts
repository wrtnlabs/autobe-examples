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
 * Test retrieving a SKU variant with active promotional pricing to validate
 * complete pricing tier display.
 *
 * This test validates the promotional pricing display system where buyers need
 * to see original prices, current sale prices, and sale duration to understand
 * the discount offering. Creates a SKU with full promotional pricing
 * configuration and retrieves it to verify all pricing fields are accurately
 * returned.
 *
 * Validates that sale_start_at and sale_end_at timestamps are in ISO 8601
 * format and that the pricing structure enables proper discount calculation
 * displays (e.g., showing percentage off from compare_at_price to sale_price).
 * Confirms the response includes complete SKU details with all pricing tiers,
 * enabling the frontend to display messages like 'Save 20%' or 'Sale ends in 3
 * days'.
 *
 * Steps:
 *
 * 1. Create admin account and authenticate
 * 2. Create product category
 * 3. Create seller account and authenticate
 * 4. Create parent product sale
 * 5. Create SKU with complete promotional pricing (base_price, compare_at_price,
 *    sale_price, sale_start_at, sale_end_at)
 * 6. Retrieve SKU using public endpoint (no auth required)
 * 7. Validate all pricing tiers are present and correctly formatted
 * 8. Verify pricing relationships and ISO 8601 timestamp formats
 */
export async function test_api_sku_retrieval_with_promotional_pricing(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
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
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 2: Create product category
  const categoryCreateData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateData,
    });
  typia.assert(category);

  // Step 3: Create seller account and authenticate
  const sellerCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({ sentences: 10 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateData,
    });
  typia.assert(seller);

  // Step 4: Create parent product sale
  const saleCreateData = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    condition: "new" as const,
    short_description: RandomGenerator.paragraph({ sentences: 5 }),
    meta_keywords: RandomGenerator.paragraph({ sentences: 3 }),
    weight: typia.random<number>(),
    dimension_length: typia.random<number>(),
    dimension_width: typia.random<number>(),
    dimension_height: typia.random<number>(),
    manufacturer: RandomGenerator.name(2),
    return_policy_days: 30 as const,
    warranty_info: RandomGenerator.paragraph({ sentences: 10 }),
    status: "published",
  } satisfies IShoppingMallSale.ICreate;

  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: saleCreateData,
    });
  typia.assert(sale);

  // Step 5: Create SKU with complete promotional pricing
  const now = new Date();
  const saleStartDate = new Date(now.getTime() - 86400000); // 1 day ago
  const saleEndDate = new Date(now.getTime() + 2592000000); // 30 days from now

  const skuCreateData = {
    sku_code: RandomGenerator.alphaNumeric(8),
    variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
    base_price: 99.99,
    compare_at_price: 129.99,
    sale_price: 79.99,
    sale_start_at: saleStartDate.toISOString(),
    sale_end_at: saleEndDate.toISOString(),
    cost_price: 50.0,
    barcode: RandomGenerator.alphaNumeric(12),
    enabled: true,
  } satisfies IShoppingMallSaleSku.ICreate;

  const createdSku: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: skuCreateData,
    });
  typia.assert(createdSku);

  // Step 6: Retrieve SKU using public endpoint (create unauthenticated connection)
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  const retrievedSku: IShoppingMallSaleSku =
    await api.functional.shoppingMall.sales.skus.at(publicConnection, {
      saleCode: sale.code,
      skuCode: createdSku.sku_code,
    });
  typia.assert(retrievedSku);

  // Step 7: Validate all pricing tiers are present and correctly formatted
  TestValidator.equals("SKU ID matches", retrievedSku.id, createdSku.id);
  TestValidator.equals(
    "SKU code matches",
    retrievedSku.sku_code,
    skuCreateData.sku_code,
  );
  TestValidator.equals(
    "Base price is correct",
    retrievedSku.base_price,
    skuCreateData.base_price,
  );
  TestValidator.equals(
    "Compare at price is correct",
    retrievedSku.compare_at_price,
    skuCreateData.compare_at_price,
  );
  TestValidator.equals(
    "Sale price is correct",
    retrievedSku.sale_price,
    skuCreateData.sale_price,
  );

  // Step 8: Verify pricing relationships and ISO 8601 timestamp formats
  TestValidator.predicate(
    "Sale price is less than base price",
    retrievedSku.sale_price !== null &&
      retrievedSku.sale_price !== undefined &&
      retrievedSku.sale_price < retrievedSku.base_price,
  );

  TestValidator.predicate(
    "Compare at price is greater than or equal to base price",
    retrievedSku.compare_at_price !== null &&
      retrievedSku.compare_at_price !== undefined &&
      retrievedSku.compare_at_price >= retrievedSku.base_price,
  );

  TestValidator.predicate(
    "Sale start timestamp is present",
    retrievedSku.sale_start_at !== null &&
      retrievedSku.sale_start_at !== undefined,
  );

  TestValidator.predicate(
    "Sale end timestamp is present",
    retrievedSku.sale_end_at !== null && retrievedSku.sale_end_at !== undefined,
  );

  // Validate ISO 8601 format for timestamps
  const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

  if (retrievedSku.sale_start_at) {
    TestValidator.predicate(
      "Sale start timestamp is in ISO 8601 format",
      iso8601Pattern.test(retrievedSku.sale_start_at),
    );
  }

  if (retrievedSku.sale_end_at) {
    TestValidator.predicate(
      "Sale end timestamp is in ISO 8601 format",
      iso8601Pattern.test(retrievedSku.sale_end_at),
    );
  }

  // Validate discount calculation is possible
  if (retrievedSku.compare_at_price && retrievedSku.sale_price) {
    const discountPercentage =
      ((retrievedSku.compare_at_price - retrievedSku.sale_price) /
        retrievedSku.compare_at_price) *
      100;
    TestValidator.predicate(
      "Discount percentage can be calculated",
      discountPercentage > 0 && discountPercentage <= 100,
    );
  }

  // Validate SKU is enabled and retrievable
  TestValidator.equals("SKU is enabled", retrievedSku.enabled, true);
  TestValidator.equals(
    "Variant combination matches",
    retrievedSku.variant_combination,
    skuCreateData.variant_combination,
  );
}
