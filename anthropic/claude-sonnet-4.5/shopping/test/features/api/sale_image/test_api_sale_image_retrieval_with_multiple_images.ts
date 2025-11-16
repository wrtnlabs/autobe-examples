import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test retrieving specific images from a product sale that has multiple images
 * with different display orders and primary designations.
 *
 * The test workflow:
 *
 * 1. Authenticate as admin for category creation
 * 2. Create a product category
 * 3. Authenticate as seller for data setup
 * 4. Create a product sale listing
 * 5. Switch back to admin authentication
 * 6. Upload multiple images (at least 3) with different display orders and primary
 *    flags
 * 7. Retrieve each image individually by its ID
 * 8. Validate that each retrieved image matches the uploaded data
 * 9. Verify that image properties (display_order, is_primary, alt_text) are
 *    correctly preserved
 * 10. Confirm that retrieving one image doesn't affect or return other images
 *
 * This scenario validates that the image retrieval system correctly handles
 * products with multiple images, ensuring each image maintains its individual
 * properties and can be accessed independently. This is critical for product
 * galleries where buyers need to view different product angles and variants.
 */
export async function test_api_sale_image_retrieval_with_multiple_images(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to create category
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
      ip: "127.0.0.1",
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/home",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: "https://marketplace.example.com/seller/join",
      referrer: "https://marketplace.example.com/seller/info",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create a product sale listing
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.name(4),
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: RandomGenerator.name(1),
        condition: "new",
        short_description: RandomGenerator.paragraph({ sentences: 10 }),
        meta_keywords: ArrayUtil.repeat(5, () => RandomGenerator.name(1)).join(
          ", ",
        ),
        weight: typia.random<number>(),
        dimension_length: typia.random<number>(),
        dimension_width: typia.random<number>(),
        dimension_height: typia.random<number>(),
        manufacturer: RandomGenerator.name(2),
        return_policy_days: 30,
        warranty_info: RandomGenerator.paragraph({ sentences: 15 }),
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Switch back to admin authentication for image upload
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "127.0.0.1",
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/home",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 6: Upload multiple images with different properties
  const imageData = [
    {
      is_primary: true,
      display_order: 0,
      alt_text: "Primary product image - front view",
    },
    {
      is_primary: false,
      display_order: 1,
      alt_text: "Product image - side view",
    },
    {
      is_primary: false,
      display_order: 2,
      alt_text: "Product image - back view",
    },
  ];

  const uploadedImages: IShoppingMallSaleImage[] = [];

  for (const data of imageData) {
    const baseUrl = typia.random<string & tags.Format<"uri">>();
    const image = await api.functional.shoppingMall.admin.sales.images.create(
      connection,
      {
        saleCode: sale.code,
        body: {
          shopping_mall_sale_sku_id: null,
          url_original: `${baseUrl}/original.jpg`,
          url_large: `${baseUrl}/large.jpg`,
          url_medium: `${baseUrl}/medium.jpg`,
          url_small: `${baseUrl}/small.jpg`,
          url_thumbnail: `${baseUrl}/thumbnail.jpg`,
          is_primary: data.is_primary,
          display_order: data.display_order,
          alt_text: data.alt_text,
        } satisfies IShoppingMallSaleImage.ICreate,
      },
    );
    typia.assert(image);
    uploadedImages.push(image);
  }

  // Step 7-10: Retrieve each image individually and validate
  for (let i = 0; i < uploadedImages.length; i++) {
    const uploadedImage = uploadedImages[i];
    const originalImageData = imageData[i];

    // Retrieve the image by its ID
    const retrievedImage = await api.functional.shoppingMall.sales.images.at(
      connection,
      {
        saleCode: sale.code,
        imageId: uploadedImage.id,
      },
    );
    typia.assert(retrievedImage);

    // Validate that retrieved image matches uploaded data
    TestValidator.equals(
      "image ID matches",
      retrievedImage.id,
      uploadedImage.id,
    );
    TestValidator.equals(
      "image sale ID matches",
      retrievedImage.shopping_mall_sale_id,
      sale.id,
    );
    TestValidator.equals(
      "image SKU ID matches",
      retrievedImage.shopping_mall_sale_sku_id,
      uploadedImage.shopping_mall_sale_sku_id,
    );

    // Verify URL variants are preserved
    TestValidator.equals(
      "original URL matches",
      retrievedImage.url_original,
      uploadedImage.url_original,
    );
    TestValidator.equals(
      "large URL matches",
      retrievedImage.url_large,
      uploadedImage.url_large,
    );
    TestValidator.equals(
      "medium URL matches",
      retrievedImage.url_medium,
      uploadedImage.url_medium,
    );
    TestValidator.equals(
      "small URL matches",
      retrievedImage.url_small,
      uploadedImage.url_small,
    );
    TestValidator.equals(
      "thumbnail URL matches",
      retrievedImage.url_thumbnail,
      uploadedImage.url_thumbnail,
    );

    // Verify critical image properties
    TestValidator.equals(
      "is_primary flag matches",
      retrievedImage.is_primary,
      originalImageData.is_primary,
    );
    TestValidator.equals(
      "display_order matches",
      retrievedImage.display_order,
      originalImageData.display_order,
    );
    TestValidator.equals(
      "alt_text matches",
      retrievedImage.alt_text,
      originalImageData.alt_text,
    );

    // Verify created_at timestamp exists
    TestValidator.predicate(
      "created_at is valid",
      retrievedImage.created_at !== null &&
        retrievedImage.created_at !== undefined,
    );
  }

  // Additional validation: Ensure only one image is primary
  const primaryImages = uploadedImages.filter((img) => img.is_primary);
  TestValidator.equals("exactly one primary image", primaryImages.length, 1);

  // Validate display_order uniqueness
  const displayOrders = uploadedImages.map((img) => img.display_order);
  const uniqueOrders = new Set(displayOrders);
  TestValidator.equals(
    "display orders are unique",
    uniqueOrders.size,
    displayOrders.length,
  );
}
