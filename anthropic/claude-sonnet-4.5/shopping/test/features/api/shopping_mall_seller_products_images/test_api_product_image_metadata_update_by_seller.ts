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
 * Test the complete workflow for sellers to update metadata and properties of
 * an existing product image.
 *
 * This test validates that sellers can optimize their product presentation by
 * modifying image properties without re-uploading images. The workflow
 * includes:
 *
 * 1. Create admin account for category management
 * 2. Admin creates a product category
 * 3. Create seller account for product and image management
 * 4. Seller creates a product in the category
 * 5. Seller uploads an initial product image
 * 6. Seller updates the image metadata (display_order)
 * 7. Verify updated metadata is correctly reflected
 *
 * The test ensures proper authentication switching between admin and seller
 * roles, validates referential integrity between product and image entities,
 * and confirms that image metadata updates are applied correctly.
 */
export async function test_api_product_image_metadata_update_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Admin creates a product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account for product and image management
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.name(3),
      business_type: "LLC",
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({
        sentences: 5,
        wordMin: 3,
        wordMax: 8,
      }),
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Seller creates a product in the category
  const productName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const basePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
  >() satisfies number as number;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: productName,
        base_price: basePrice,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 5: Seller uploads an initial product image
  const imageUrl = typia.random<string & tags.Format<"url">>();

  const uploadedImage =
    await api.functional.shoppingMall.seller.products.images.createImage(
      connection,
      {
        productId: product.id,
        body: {
          image_url: imageUrl,
        } satisfies IShoppingMallProduct.IImageCreate,
      },
    );
  typia.assert(uploadedImage);

  // Verify initial image properties
  TestValidator.equals(
    "uploaded image has correct product id",
    uploadedImage.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "uploaded image has correct url",
    uploadedImage.image_url,
    imageUrl,
  );

  // Step 6: Seller updates the image metadata (display_order)
  const newDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
  >() satisfies number as number;

  const updatedImage =
    await api.functional.shoppingMall.seller.products.images.updateImage(
      connection,
      {
        productId: product.id,
        imageId: uploadedImage.id,
        body: {
          display_order: newDisplayOrder,
        } satisfies IShoppingMallProduct.IImageUpdate,
      },
    );
  typia.assert(updatedImage);

  // Step 7: Verify updated metadata is correctly reflected
  TestValidator.equals(
    "updated image has same id",
    updatedImage.id,
    uploadedImage.id,
  );
  TestValidator.equals(
    "updated image has correct product id",
    updatedImage.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "updated image has new display order",
    updatedImage.display_order,
    newDisplayOrder,
  );
  TestValidator.equals(
    "updated image maintains image url",
    updatedImage.image_url,
    imageUrl,
  );
}
