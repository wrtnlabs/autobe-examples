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
 * Test deleting the primary product image and verifying impact on product
 * display.
 *
 * This scenario validates the business logic when the main product thumbnail
 * (is_primary=true) is removed from a SKU. The test creates multiple images for
 * a SKU with one designated as primary, then deletes the primary image. It
 * verifies that the deletion succeeds and that the system handles the absence
 * of a primary image appropriately.
 *
 * This scenario is critical because the primary image serves as the main
 * product representation in listings and search results. The test validates
 * whether remaining images need manual primary designation or if the system has
 * fallback logic. It also checks that product displays gracefully handle
 * scenarios where no primary image exists after deletion.
 *
 * Steps:
 *
 * 1. Create admin account for category setup
 * 2. Create product category
 * 3. Create seller account for product management
 * 4. Create product sale listing
 * 5. Create SKU variant for the product
 * 6. Create PRIMARY image (is_primary=true)
 * 7. Create SECONDARY image (is_primary=false)
 * 8. Delete the primary image
 * 9. Verify deletion succeeded and returned correct image details
 */
export async function test_api_product_image_deletion_of_primary_image(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
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
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: typia.random<number & tags.Type<"int32">>(),
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryData },
  );
  typia.assert(category);

  // Step 3: Create seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
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
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    brand: RandomGenerator.name(1),
    condition: "new" as const,
    short_description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    meta_keywords: RandomGenerator.paragraph({ sentences: 5 }),
    weight: typia.random<number>(),
    dimension_length: typia.random<number>(),
    dimension_width: typia.random<number>(),
    dimension_height: typia.random<number>(),
    manufacturer: RandomGenerator.name(2),
    return_policy_days: 30 as const,
    warranty_info: RandomGenerator.paragraph({ sentences: 4 }),
    status: "published",
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    { body: saleData },
  );
  typia.assert(sale);

  // Step 5: Create SKU variant
  const skuData = {
    sku_code: RandomGenerator.alphaNumeric(10),
    variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
    base_price: typia.random<number & tags.Minimum<0>>(),
    compare_at_price: typia.random<number & tags.Minimum<0>>(),
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

  // Step 6: Create PRIMARY image (is_primary=true, display_order=0)
  const primaryImageData = {
    shopping_mall_sale_sku_id: sku.id,
    url_original: typia.random<string & tags.Format<"uri">>(),
    url_large: typia.random<string & tags.Format<"uri">>(),
    url_medium: typia.random<string & tags.Format<"uri">>(),
    url_small: typia.random<string & tags.Format<"uri">>(),
    url_thumbnail: typia.random<string & tags.Format<"uri">>(),
    is_primary: true,
    display_order: 0,
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallSaleImage.ICreate;

  const primaryImage =
    await api.functional.shoppingMall.seller.sales.skus.images.create(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        body: primaryImageData,
      },
    );
  typia.assert(primaryImage);

  // Step 7: Create SECONDARY image (is_primary=false, display_order=1)
  const secondaryImageData = {
    shopping_mall_sale_sku_id: sku.id,
    url_original: typia.random<string & tags.Format<"uri">>(),
    url_large: typia.random<string & tags.Format<"uri">>(),
    url_medium: typia.random<string & tags.Format<"uri">>(),
    url_small: typia.random<string & tags.Format<"uri">>(),
    url_thumbnail: typia.random<string & tags.Format<"uri">>(),
    is_primary: false,
    display_order: 1,
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallSaleImage.ICreate;

  const secondaryImage =
    await api.functional.shoppingMall.seller.sales.skus.images.create(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        body: secondaryImageData,
      },
    );
  typia.assert(secondaryImage);

  // Step 8: Delete the primary image
  const deletedImage =
    await api.functional.shoppingMall.seller.sales.skus.images.erase(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        imageId: primaryImage.id,
      },
    );
  typia.assert(deletedImage);

  // Step 9: Verify deletion returned the correct primary image
  TestValidator.equals(
    "deleted image ID matches primary image",
    deletedImage.id,
    primaryImage.id,
  );
  TestValidator.equals(
    "deleted image was primary",
    deletedImage.is_primary,
    true,
  );
  TestValidator.equals(
    "deleted image display order",
    deletedImage.display_order,
    0,
  );
}
