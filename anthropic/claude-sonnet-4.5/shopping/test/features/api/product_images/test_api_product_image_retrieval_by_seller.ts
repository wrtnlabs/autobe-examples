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
 * Test that sellers can retrieve detailed information about a specific product
 * image they own.
 *
 * This test validates the complete workflow for product image retrieval by
 * sellers:
 *
 * 1. Create admin account and create product category
 * 2. Create and authenticate seller account
 * 3. Seller creates product in the category
 * 4. Seller uploads image to product
 * 5. Seller retrieves specific image details
 * 6. Validate response includes complete metadata (URL, display order, primary
 *    status, SKU association, alt text, timestamps)
 *
 * The test ensures sellers can access images for their own products and
 * validates that all image metadata is properly returned including optional
 * fields.
 */
export async function test_api_product_image_retrieval_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate to set up category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Admin creates product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Create and authenticate seller account (this overwrites admin auth)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const businessType = RandomGenerator.pick([
    "individual",
    "LLC",
    "corporation",
    "partnership",
  ] as const);

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        business_name: RandomGenerator.name(),
        business_type: businessType,
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Seller creates product
  const productName = RandomGenerator.name();
  const basePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: productName,
        base_price: basePrice,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Step 5: Seller uploads image to product
  const imageUrl = typia.random<string & tags.Format<"url">>();

  const uploadedImage: IShoppingMallProductImage =
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

  // Step 6: Seller retrieves specific image details
  const retrievedImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.seller.products.images.at(connection, {
      productId: product.id,
      imageId: uploadedImage.id,
    });
  typia.assert(retrievedImage);

  // Step 7: Validate response includes complete metadata
  TestValidator.equals(
    "image ID matches uploaded image",
    retrievedImage.id,
    uploadedImage.id,
  );
  TestValidator.equals(
    "product ID matches created product",
    retrievedImage.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "image URL matches uploaded URL",
    retrievedImage.image_url,
    imageUrl,
  );
  TestValidator.predicate(
    "display order is valid integer",
    typeof retrievedImage.display_order === "number" &&
      Number.isInteger(retrievedImage.display_order),
  );
  TestValidator.predicate(
    "is_primary is boolean value",
    typeof retrievedImage.is_primary === "boolean",
  );
  TestValidator.predicate(
    "created_at is valid date-time string",
    typeof retrievedImage.created_at === "string" &&
      retrievedImage.created_at.length > 0,
  );

  // Validate optional fields are present in response (can be null/undefined)
  TestValidator.predicate(
    "shopping_mall_sku_id field exists in response",
    "shopping_mall_sku_id" in retrievedImage,
  );
  TestValidator.predicate(
    "alt_text field exists in response",
    "alt_text" in retrievedImage,
  );
}
