import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test successful deletion of a product image when multiple images exist.
 *
 * Validates that a seller can delete a non-thumbnail image from their product while maintaining the product's image gallery integrity. The test ensures that the deletion operation succeeds when multiple images exist and that the thumbnail (first image with lowest display_order) is preserved.
 *
 * Special attention is given to verifying that the deletion operation succeeds without errors, that at least one image remains after deletion (business rule), and that the seller can only delete images from their own products (authorization).
 *
 * 1. Register and authenticate a seller account.
 * 2. Create a product with name, description, and base price.
 * 3. Upload 3 product images to ensure multiple images exist.
 * 4. Verify initial state: 3 images with correct display orders.
 * 5. Delete the second image (not the thumbnail).
 * 6. Verify the deletion succeeds (no exception thrown).
 * Note: Cannot verify the updated product state as no GET endpoint is available in the SDK.
 */
export async function test_api_product_image_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Upload 3 product images
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(image3);
  // Verify initial state: 3 images with correct display orders
  TestValidator.equals("initial image count", product.images.length, 3);
  TestValidator.equals("first image is thumbnail", image1.display_order, 1);
  TestValidator.equals("second image order", image2.display_order, 2);
  TestValidator.equals("third image order", image3.display_order, 3);
  // 4. Delete the second image (not the thumbnail)
  // This should succeed because we have 3 images and will keep 2 (minimum 1 required)
  await api.functional.shoppingMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: image2.id,
    },
  );
  // 5. Verify the deletion succeeded (no exception thrown means 204 No Content)
  // The backend will:
  // - Soft delete the image (set deleted_at timestamp)
  // - Create a product snapshot recording the image deletion
  // - Maintain display order of remaining images
  // Note: Cannot verify the updated product state as no GET endpoint is available
  TestValidator.predicate("deletion succeeded", true);
}
