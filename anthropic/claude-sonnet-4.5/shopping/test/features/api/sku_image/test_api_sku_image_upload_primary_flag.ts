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
 * Test uploading multiple images to a SKU with primary image designation.
 *
 * This test validates the complete workflow of SKU variant image management,
 * ensuring that multiple images can be uploaded with proper primary flag
 * assignment and display order sequencing. The test verifies that the primary
 * image is correctly designated and that all images maintain their proper
 * display order for gallery presentation.
 *
 * Test Flow:
 *
 * 1. Create and authenticate seller account
 * 2. Create admin account and category (switching contexts)
 * 3. Create product sale listing
 * 4. Create SKU variant
 * 5. Upload multiple images with varied is_primary and display_order
 * 6. Validate primary flag and display order correctness
 */
export async function test_api_sku_image_upload_primary_flag(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: "https://seller.example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create admin account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      href: "https://admin.example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: 0,
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller authentication
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://seller.example.com/login",
      referrer: "https://seller.example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Create product sale listing
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: RandomGenerator.name(1),
        condition: "new" as const,
        return_policy_days: 30,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 6: Create SKU variant
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(16),
        variant_combination: JSON.stringify({ color: "Red", size: "Large" }),
        base_price: 99.99,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 7: Upload multiple images with different is_primary and display_order values
  const imageCount = 5;
  const uploadedImages: IShoppingMallSaleImage[] = [];

  for (let i = 0; i < imageCount; i++) {
    const isPrimary = i === 0; // First image is primary
    const displayOrder = i;

    const image =
      await api.functional.shoppingMall.seller.sales.skus.images.create(
        connection,
        {
          saleCode: sale.code,
          skuCode: sku.sku_code,
          body: {
            shopping_mall_sale_sku_id: sku.id,
            url_original: `https://cdn.example.com/original-${i}.jpg`,
            url_large: `https://cdn.example.com/large-${i}.jpg`,
            url_medium: `https://cdn.example.com/medium-${i}.jpg`,
            url_small: `https://cdn.example.com/small-${i}.jpg`,
            url_thumbnail: `https://cdn.example.com/thumb-${i}.jpg`,
            is_primary: isPrimary,
            display_order: displayOrder,
            alt_text: `Product image ${i + 1}`,
          } satisfies IShoppingMallSaleImage.ICreate,
        },
      );
    typia.assert(image);
    uploadedImages.push(image);
  }

  // Step 8: Validate uploaded images
  TestValidator.equals(
    "uploaded image count matches expected",
    uploadedImages.length,
    imageCount,
  );

  // Validate primary image designation
  const primaryImages = uploadedImages.filter((img) => img.is_primary);
  TestValidator.equals(
    "exactly one primary image exists",
    primaryImages.length,
    1,
  );

  TestValidator.equals(
    "primary image is the first uploaded image",
    primaryImages[0].display_order,
    0,
  );

  // Validate display order uniqueness
  const displayOrders = uploadedImages.map((img) => img.display_order);
  const uniqueOrders = new Set(displayOrders);
  TestValidator.equals(
    "all display orders are unique",
    uniqueOrders.size,
    displayOrders.length,
  );

  // Validate images are properly ordered by display_order
  for (let i = 0; i < uploadedImages.length; i++) {
    TestValidator.equals(
      `image ${i} has correct display order`,
      uploadedImages[i].display_order,
      i,
    );
  }

  // Validate all images have required URL variants
  for (const image of uploadedImages) {
    TestValidator.predicate(
      "image has all required URL variants",
      !!(
        image.url_original &&
        image.url_large &&
        image.url_medium &&
        image.url_small &&
        image.url_thumbnail
      ),
    );
  }
}
