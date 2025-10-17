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
 * Test that administrators can retrieve detailed information about any product
 * image across the platform for moderation and quality control purposes.
 *
 * This test validates the complete workflow for admin image retrieval:
 *
 * 1. Create seller account for product ownership
 * 2. Create admin account for privileged access
 * 3. Create product category (prerequisite)
 * 4. Create product as seller
 * 5. Upload image to product as seller
 * 6. Authenticate as admin
 * 7. Retrieve specific image details as admin
 * 8. Validate complete image metadata is returned
 */
export async function test_api_product_image_retrieval_by_admin(
  connection: api.IConnection,
) {
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const sellerData = {
    email: sellerEmail,
    password: sellerPassword,
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const adminData = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });

  const productData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 5 }),
    base_price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  const imageUrl = `https://cdn.example.com/images/${RandomGenerator.alphaNumeric(16)}.jpg`;
  const imageData = {
    image_url: imageUrl,
  } satisfies IShoppingMallProduct.IImageCreate;

  const uploadedImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.seller.products.images.createImage(
      connection,
      {
        productId: product.id,
        body: imageData,
      },
    );
  typia.assert(uploadedImage);

  await api.functional.auth.admin.join(connection, {
    body: adminData,
  });

  const retrievedImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.admin.products.images.at(connection, {
      productId: product.id,
      imageId: uploadedImage.id,
    });
  typia.assert(retrievedImage);

  TestValidator.equals(
    "retrieved image ID matches uploaded image ID",
    retrievedImage.id,
    uploadedImage.id,
  );
  TestValidator.equals(
    "retrieved image product ID matches",
    retrievedImage.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "retrieved image URL matches uploaded URL",
    retrievedImage.image_url,
    imageUrl,
  );
}
