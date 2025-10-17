import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test product image upload limit enforcement.
 *
 * This test validates that the system properly enforces the maximum limit of 10
 * images per product as defined in business requirements. The test creates the
 * necessary prerequisites (admin, category, seller, product) and then attempts
 * to upload 11 images sequentially to verify that:
 *
 * 1. The first 10 image uploads succeed with proper display_order assignment (0-9)
 * 2. Each successful upload returns a valid IShoppingMallProductImage
 * 3. The 11th image upload attempt is rejected with an appropriate error
 * 4. The business rule limiting products to 10 images is properly enforced
 *
 * This ensures sellers cannot add excessive images that would impact page load
 * performance and user experience.
 */
export async function test_api_product_image_upload_exceeding_limit(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create product category as admin
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        business_name: RandomGenerator.name(),
        business_type: "LLC",
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 2 }),
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Create product as seller
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.name(3),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Step 5: Upload 10 images successfully
  const uploadedImages: IShoppingMallProductImage[] = [];

  for (let i = 0; i < 10; i++) {
    const image: IShoppingMallProductImage =
      await api.functional.shoppingMall.seller.products.images.createImage(
        connection,
        {
          productId: product.id,
          body: {
            image_url: typia.random<string & tags.Format<"url">>(),
          } satisfies IShoppingMallProduct.IImageCreate,
        },
      );
    typia.assert(image);
    uploadedImages.push(image);

    // Verify display_order is correct
    TestValidator.equals(
      `image ${i + 1} has correct display_order`,
      image.display_order,
      i,
    );
  }

  // Verify we have exactly 10 images
  TestValidator.equals("uploaded exactly 10 images", uploadedImages.length, 10);

  // Step 6: Attempt to upload 11th image (should fail)
  await TestValidator.error(
    "11th image upload should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.images.createImage(
        connection,
        {
          productId: product.id,
          body: {
            image_url: typia.random<string & tags.Format<"url">>(),
          } satisfies IShoppingMallProduct.IImageCreate,
        },
      );
    },
  );
}
