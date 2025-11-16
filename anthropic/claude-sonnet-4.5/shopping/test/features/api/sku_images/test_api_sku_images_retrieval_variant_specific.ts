import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test retrieving product images specifically associated with a SKU variant.
 *
 * This test validates the variant-specific image filtering functionality where
 * products with multiple variants (e.g., different colors) can have distinct
 * images for each variant. The test creates a complete product setup with a SKU
 * variant and then retrieves images filtered by that specific SKU to verify
 * that only variant-specific images are returned.
 *
 * Test Flow:
 *
 * 1. Create admin account and category
 * 2. Create seller account and product sale listing
 * 3. Create a SKU variant for the product
 * 4. Retrieve images filtered by the SKU variant
 * 5. Validate that the response contains only SKU-specific images
 */
export async function test_api_sku_images_retrieval_variant_specific(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const adminData = {
    email: adminEmail,
    password: adminPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create product category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph(),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);

  const sellerData = {
    email: sellerEmail,
    password: sellerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph(),
    store_name: RandomGenerator.name(2),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 4: Create product sale listing
  const saleCode = RandomGenerator.alphaNumeric(16);

  const saleData = {
    code: saleCode,
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    condition: "new" as const,
    short_description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 10,
      wordMax: 15,
    }),
    meta_keywords: RandomGenerator.name(5),
    weight: typia.random<number>(),
    dimension_length: typia.random<number>(),
    dimension_width: typia.random<number>(),
    dimension_height: typia.random<number>(),
    manufacturer: RandomGenerator.name(2),
    return_policy_days: 30 as const,
    warranty_info: RandomGenerator.paragraph(),
    status: "published",
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleData,
    },
  );
  typia.assert(sale);

  // Step 5: Create SKU variant
  const skuCode = RandomGenerator.alphaNumeric(12);
  const variantCombination = JSON.stringify({ Color: "Red", Size: "Large" });

  const skuData = {
    sku_code: skuCode,
    variant_combination: variantCombination,
    base_price: 99.99,
    compare_at_price: 149.99,
    sale_price: 79.99,
    sale_start_at: new Date().toISOString(),
    sale_end_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    cost_price: 45.5,
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

  // Step 6: Retrieve images filtered by SKU variant
  const imageRequest = {
    page: 1,
    limit: 20,
    shopping_mall_sale_sku_id: sku.id,
  } satisfies IShoppingMallSaleImage.IRequest;

  const imageResponse =
    await api.functional.shoppingMall.sales.skus.images.index(connection, {
      saleCode: sale.code,
      skuCode: sku.sku_code,
      body: imageRequest,
    });
  typia.assert(imageResponse);

  // Step 7: Validate response structure
  TestValidator.predicate(
    "response should have pagination metadata",
    imageResponse.pagination !== null && imageResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "response should have data array",
    Array.isArray(imageResponse.data),
  );

  TestValidator.predicate(
    "pagination should have valid structure",
    imageResponse.pagination.current >= 1 &&
      imageResponse.pagination.limit === 20 &&
      imageResponse.pagination.records >= 0 &&
      imageResponse.pagination.pages >= 0,
  );

  // Step 8: Validate SKU-specific filtering
  // All returned images should be associated with the requested SKU
  for (const image of imageResponse.data) {
    TestValidator.equals(
      "image should be associated with the requested SKU",
      image.shopping_mall_sale_sku_id,
      sku.id,
    );

    TestValidator.equals(
      "image should belong to the correct sale",
      image.shopping_mall_sale_id,
      sale.id,
    );
  }
}
