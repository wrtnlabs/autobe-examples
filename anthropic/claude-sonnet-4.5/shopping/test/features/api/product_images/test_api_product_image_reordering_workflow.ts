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
 * Test the complete image gallery reordering workflow for seller product
 * management.
 *
 * This test validates the seller's ability to reorganize product images by
 * updating display_order values to optimize product presentation for better
 * customer engagement.
 *
 * Workflow steps:
 *
 * 1. Create admin account and authenticate
 * 2. Create product category as admin
 * 3. Create seller account and authenticate
 * 4. Create product as seller
 * 5. Upload three product images with default ordering (0, 1, 2)
 * 6. Reorder images by updating display_order values (2, 0, 1)
 * 7. Validate successful reordering and proper response data
 */
export async function test_api_product_image_reordering_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create product category as admin
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 3: Create and authenticate seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 2 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 4: Create product as seller
  const productData = {
    name: RandomGenerator.name(3),
    base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 5: Upload three product images with default ordering
  const imageUrls = ArrayUtil.repeat(
    3,
    () => `https://example.com/images/${RandomGenerator.alphaNumeric(16)}.jpg`,
  );

  const uploadedImages = await ArrayUtil.asyncMap(
    imageUrls,
    async (imageUrl) => {
      const imageData = {
        image_url: imageUrl,
      } satisfies IShoppingMallProduct.IImageCreate;

      const image =
        await api.functional.shoppingMall.seller.products.images.createImage(
          connection,
          {
            productId: product.id,
            body: imageData,
          },
        );
      typia.assert(image);
      return image;
    },
  );

  // Validate initial ordering (0, 1, 2)
  TestValidator.equals(
    "first image initial display_order",
    uploadedImages[0].display_order,
    0,
  );
  TestValidator.equals(
    "second image initial display_order",
    uploadedImages[1].display_order,
    1,
  );
  TestValidator.equals(
    "third image initial display_order",
    uploadedImages[2].display_order,
    2,
  );

  // Step 6: Reorder images by updating display_order values
  // Update first image: display_order 0 -> 2
  const updatedImage1 =
    await api.functional.shoppingMall.seller.products.images.updateImage(
      connection,
      {
        productId: product.id,
        imageId: uploadedImages[0].id,
        body: {
          display_order: 2,
        } satisfies IShoppingMallProduct.IImageUpdate,
      },
    );
  typia.assert(updatedImage1);

  // Update second image: display_order 1 -> 0
  const updatedImage2 =
    await api.functional.shoppingMall.seller.products.images.updateImage(
      connection,
      {
        productId: product.id,
        imageId: uploadedImages[1].id,
        body: {
          display_order: 0,
        } satisfies IShoppingMallProduct.IImageUpdate,
      },
    );
  typia.assert(updatedImage2);

  // Update third image: display_order 2 -> 1
  const updatedImage3 =
    await api.functional.shoppingMall.seller.products.images.updateImage(
      connection,
      {
        productId: product.id,
        imageId: uploadedImages[2].id,
        body: {
          display_order: 1,
        } satisfies IShoppingMallProduct.IImageUpdate,
      },
    );
  typia.assert(updatedImage3);

  // Step 7: Validate successful reordering
  TestValidator.equals(
    "first image updated display_order",
    updatedImage1.display_order,
    2,
  );
  TestValidator.equals(
    "second image updated display_order",
    updatedImage2.display_order,
    0,
  );
  TestValidator.equals(
    "third image updated display_order",
    updatedImage3.display_order,
    1,
  );

  // Validate that image IDs remain unchanged
  TestValidator.equals(
    "first image ID unchanged",
    updatedImage1.id,
    uploadedImages[0].id,
  );
  TestValidator.equals(
    "second image ID unchanged",
    updatedImage2.id,
    uploadedImages[1].id,
  );
  TestValidator.equals(
    "third image ID unchanged",
    updatedImage3.id,
    uploadedImages[2].id,
  );

  // Validate proper product association
  TestValidator.equals(
    "first image product association",
    updatedImage1.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "second image product association",
    updatedImage2.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "third image product association",
    updatedImage3.shopping_mall_product_id,
    product.id,
  );
}
