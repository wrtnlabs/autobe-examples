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
 * Test complete workflow for seller product image upload.
 *
 * This test validates the entire process of sellers uploading images to their
 * product listings, including all prerequisite steps such as admin setup,
 * category creation, seller registration, and product creation. The test
 * ensures proper authentication, ownership validation, and correct image
 * metadata assignment.
 *
 * Workflow:
 *
 * 1. Create and authenticate as admin for category management
 * 2. Create a product category (required for product creation)
 * 3. Create and authenticate as seller for product operations
 * 4. Create a product in the seller's catalog
 * 5. Upload an image to the product
 * 6. Validate image record with proper metadata
 */
export async function test_api_product_image_upload_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
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

  // Step 3: Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        business_name: RandomGenerator.name(2),
        business_type: "LLC",
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 3 }),
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
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100000>
        >() satisfies number as number,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Step 5: Upload product image
  const imageUrl = typia.random<string & tags.Format<"url">>();
  const productImage: IShoppingMallProductImage =
    await api.functional.shoppingMall.seller.products.images.createImage(
      connection,
      {
        productId: product.id,
        body: {
          image_url: imageUrl,
        } satisfies IShoppingMallProduct.IImageCreate,
      },
    );
  typia.assert(productImage);

  // Step 6: Validate image record - typia.assert already validated all types
  TestValidator.equals(
    "image product association",
    productImage.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals("image URL matches", productImage.image_url, imageUrl);
}
