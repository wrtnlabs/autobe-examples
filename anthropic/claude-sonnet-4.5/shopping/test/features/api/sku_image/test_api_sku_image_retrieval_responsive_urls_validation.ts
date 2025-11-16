import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that all responsive image URL variants are correctly returned and
 * accessible.
 *
 * This test validates the multi-resolution image strategy by creating a
 * complete product hierarchy (admin -> category -> seller -> sale -> SKU ->
 * image) and then retrieving the uploaded image to verify all five URL variants
 * are present and properly formatted.
 *
 * Steps:
 *
 * 1. Create and authenticate admin account
 * 2. Create product category as admin
 * 3. Create and authenticate seller account
 * 4. Create product sale as seller
 * 5. Create SKU variant for the product
 * 6. Upload image with all five URL variants (original, large, medium, small,
 *    thumbnail)
 * 7. Retrieve the image by ID
 * 8. Validate all URL variants are present and follow URI format
 * 9. Verify image metadata matches uploaded data
 */
export async function test_api_sku_image_retrieval_responsive_urls_validation(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" satisfies
      | "super_admin"
      | "moderator"
      | "support",
    email_verified: true,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create category as admin
  const categoryData = {
    parent_id: null,
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" satisfies "active" | "inactive",
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerData = {
    email: sellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: RandomGenerator.name(2),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 4: Create product sale as seller
  const saleCode = RandomGenerator.alphaNumeric(12);
  const saleData = {
    code: saleCode,
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    brand: RandomGenerator.name(1),
    condition: "new" satisfies "new" | "refurbished" | "used",
    short_description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 8,
    }),
    meta_keywords: RandomGenerator.paragraph({ sentences: 1 }),
    weight: typia.random<number>(),
    dimension_length: typia.random<number>(),
    dimension_width: typia.random<number>(),
    dimension_height: typia.random<number>(),
    manufacturer: RandomGenerator.name(1),
    return_policy_days: 30 satisfies 0 | 7 | 14 | 30 | 60,
    warranty_info: RandomGenerator.paragraph({ sentences: 4 }),
    status: "published",
  } satisfies IShoppingMallSale.ICreate;

  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: saleData,
    });
  typia.assert(sale);

  // Step 5: Create SKU variant
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuData = {
    sku_code: skuCode,
    variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
    base_price: typia.random<number & tags.Minimum<0>>(),
    compare_at_price: null,
    sale_price: null,
    sale_start_at: null,
    sale_end_at: null,
    cost_price: null,
    barcode: RandomGenerator.alphaNumeric(13),
    enabled: true,
  } satisfies IShoppingMallSaleSku.ICreate;

  const sku: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: skuData,
    });
  typia.assert(sku);

  // Step 6: Upload image with all five URL variants
  const imageData = {
    shopping_mall_sale_sku_id: sku.id,
    url_original: typia.random<string & tags.Format<"uri">>(),
    url_large: typia.random<string & tags.Format<"uri">>(),
    url_medium: typia.random<string & tags.Format<"uri">>(),
    url_small: typia.random<string & tags.Format<"uri">>(),
    url_thumbnail: typia.random<string & tags.Format<"uri">>(),
    is_primary: true,
    display_order: 0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    alt_text: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 6,
    }),
  } satisfies IShoppingMallSaleImage.ICreate;

  const uploadedImage: IShoppingMallSaleImage =
    await api.functional.shoppingMall.seller.sales.skus.images.create(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        body: imageData,
      },
    );
  typia.assert(uploadedImage);

  // Step 7: Retrieve the image by ID
  const retrievedImage: IShoppingMallSaleImage =
    await api.functional.shoppingMall.sales.skus.images.at(connection, {
      saleCode: sale.code,
      skuCode: sku.sku_code,
      imageId: uploadedImage.id,
    });
  typia.assert(retrievedImage);

  // Step 8: Validate all five URL variants are present and properly formatted
  TestValidator.predicate(
    "url_original should be present and valid URI",
    retrievedImage.url_original !== null &&
      retrievedImage.url_original !== undefined &&
      retrievedImage.url_original.length > 0,
  );

  TestValidator.predicate(
    "url_large should be present and valid URI for 1600x1600 zoom functionality",
    retrievedImage.url_large !== null &&
      retrievedImage.url_large !== undefined &&
      retrievedImage.url_large.length > 0,
  );

  TestValidator.predicate(
    "url_medium should be present and valid URI for 800x800 gallery display",
    retrievedImage.url_medium !== null &&
      retrievedImage.url_medium !== undefined &&
      retrievedImage.url_medium.length > 0,
  );

  TestValidator.predicate(
    "url_small should be present and valid URI for 400x400 listings",
    retrievedImage.url_small !== null &&
      retrievedImage.url_small !== undefined &&
      retrievedImage.url_small.length > 0,
  );

  TestValidator.predicate(
    "url_thumbnail should be present and valid URI for 150x150 cart displays",
    retrievedImage.url_thumbnail !== null &&
      retrievedImage.url_thumbnail !== undefined &&
      retrievedImage.url_thumbnail.length > 0,
  );

  // Step 9: Verify image metadata matches uploaded data
  TestValidator.equals(
    "image ID should match uploaded image",
    retrievedImage.id,
    uploadedImage.id,
  );

  TestValidator.equals(
    "is_primary flag should match uploaded data",
    retrievedImage.is_primary,
    imageData.is_primary,
  );

  TestValidator.equals(
    "display_order should match uploaded data",
    retrievedImage.display_order,
    imageData.display_order,
  );

  TestValidator.equals(
    "shopping_mall_sale_id should match the sale",
    retrievedImage.shopping_mall_sale_id,
    sale.id,
  );

  TestValidator.equals(
    "shopping_mall_sale_sku_id should match the SKU",
    retrievedImage.shopping_mall_sale_sku_id,
    sku.id,
  );
}
