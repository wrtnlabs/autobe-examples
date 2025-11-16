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
 * Test updating alt_text for accessibility compliance and SEO optimization.
 *
 * This test validates that sellers can modify alternative text descriptions for
 * product images to improve accessibility for screen readers and enhance search
 * engine discoverability. The test creates an image with initial alt text, then
 * updates it with more descriptive content. It verifies that alt text updates
 * are properly persisted and validates the 500-character length constraint.
 *
 * Test workflow:
 *
 * 1. Create admin account and authenticate
 * 2. Create product category (prerequisite for sales)
 * 3. Create seller account and authenticate
 * 4. Create product sale listing
 * 5. Create SKU variant for the product
 * 6. Upload image with initial alt_text
 * 7. Update the image's alt_text to more descriptive content
 * 8. Verify alt_text update was successful and persisted correctly
 */
export async function test_api_product_image_accessibility_text_update(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
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
    parent_id: null,
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Step 3: Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerData = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(3),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
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
  const saleData = {
    code: RandomGenerator.alphaNumeric(12),
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    condition: "new" as const,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    meta_keywords: RandomGenerator.paragraph({ sentences: 5 }),
    weight: typia.random<number & tags.Minimum<0>>(),
    dimension_length: typia.random<number & tags.Minimum<0>>(),
    dimension_width: typia.random<number & tags.Minimum<0>>(),
    dimension_height: typia.random<number & tags.Minimum<0>>(),
    manufacturer: RandomGenerator.name(2),
    return_policy_days: 30,
    warranty_info: RandomGenerator.paragraph({ sentences: 4 }),
    status: "published",
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: saleData,
    },
  );
  typia.assert(sale);

  // Step 5: Create SKU variant for the product
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(10),
    variant_combination: JSON.stringify({ Color: "Black", Size: "Medium" }),
    base_price: typia.random<number & tags.Minimum<0>>(),
    compare_at_price: null,
    sale_price: null,
    sale_start_at: null,
    sale_end_at: null,
    cost_price: typia.random<number & tags.Minimum<0>>(),
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

  // Step 6: Upload image with initial alt_text
  const initialAltText = "Product image showing black medium-sized item";
  const imageData = {
    shopping_mall_sale_sku_id: sku.id,
    url_original: typia.random<string & tags.Format<"uri">>(),
    url_large: typia.random<string & tags.Format<"uri">>(),
    url_medium: typia.random<string & tags.Format<"uri">>(),
    url_small: typia.random<string & tags.Format<"uri">>(),
    url_thumbnail: typia.random<string & tags.Format<"uri">>(),
    is_primary: true,
    display_order: 0,
    alt_text: initialAltText,
  } satisfies IShoppingMallSaleImage.ICreate;

  const createdImage =
    await api.functional.shoppingMall.seller.sales.skus.images.create(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        body: imageData,
      },
    );
  typia.assert(createdImage);

  // Verify initial alt_text was set correctly
  TestValidator.equals(
    "initial alt text matches",
    createdImage.alt_text,
    initialAltText,
  );

  // Step 7: Update the image's alt_text to more descriptive content
  const updatedAltText =
    "Professional product photography showing a black medium-sized premium quality item with detailed texture and finish, perfect for accessibility and SEO optimization";
  const updateData = {
    alt_text: updatedAltText,
  } satisfies IShoppingMallSaleImage.IUpdate;

  const updatedImage =
    await api.functional.shoppingMall.seller.sales.skus.images.update(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        imageId: createdImage.id,
        body: updateData,
      },
    );
  typia.assert(updatedImage);

  // Step 8: Verify alt_text update was successful
  TestValidator.equals(
    "updated alt text matches",
    updatedImage.alt_text,
    updatedAltText,
  );
  TestValidator.notEquals(
    "alt text was changed",
    updatedImage.alt_text,
    initialAltText,
  );

  // Verify character length constraint (max 500 characters)
  TestValidator.predicate(
    "alt text is within 500 character limit",
    (updatedImage.alt_text?.length ?? 0) <= 500,
  );

  // Verify other image properties remain unchanged
  TestValidator.equals("image ID unchanged", updatedImage.id, createdImage.id);
  TestValidator.equals(
    "SKU association unchanged",
    updatedImage.shopping_mall_sale_sku_id,
    sku.id,
  );
  TestValidator.equals("primary flag unchanged", updatedImage.is_primary, true);
  TestValidator.equals(
    "display order unchanged",
    updatedImage.display_order,
    0,
  );
}
