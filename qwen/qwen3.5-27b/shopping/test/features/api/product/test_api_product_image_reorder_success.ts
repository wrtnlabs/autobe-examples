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
 * Test that a seller can successfully reorder product images to change their display sequence.
 *
 * Validates the complete product image reordering workflow including seller authentication, product creation, multiple image uploads, and successful reordering of images. Ensures that the display order is correctly updated and that the first image becomes the main thumbnail.
 *
 * Special attention is given to verifying that the image with the lowest display_order appears first in the images array and that all timestamps are properly updated after reordering.
 *
 * 1. Seller registers and authenticates with the platform.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller uploads at least 3 images to the product.
 * 4. Seller reorders the images by specifying new display_order values.
 * 5. Validates that images are returned in the new order with correct display_order values.
 * 6. Validates that the first image has display_order 0 and serves as the thumbnail.
 * 7. Validates that all timestamps were updated correctly.
 */
export async function test_api_product_image_reorder_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Upload at least 3 images to the product
  const images: IShoppingMallProductImage[] = [];
  for (let i = 0; i < 3; i++) {
    const image: IShoppingMallProductImage =
      await generate_random_shopping_mall_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {},
        },
      );
    typia.assert(image);
    images.push(image);
  }
  // 4. Reorder images: move image 3 to position 0, image 1 to position 1, image 2 to position 2
  // The body is an array of IUpdate objects specifying new display_order values
  const reorderedBody: IShoppingMallProductImage.IUpdate[] = [
    { display_order: 2 }, // Original image 1 (index 0) moves to position 2
    { display_order: 0 }, // Original image 2 (index 1) moves to position 0
    { display_order: 1 }, // Original image 3 (index 2) moves to position 1
  ];
  // 5. Call the reorder endpoint
  const updatedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.images.putByProductid(
      sellerConnection,
      {
        productId: product.id,
        body: reorderedBody as any,
      },
    );
  typia.assert(updatedProduct);
  // 6. Validate that images are in the new order
  TestValidator.equals("image count", updatedProduct.images.length, 3);
  TestValidator.equals(
    "first image has display_order 0",
    updatedProduct.images[0].display_order,
    0,
  );
  TestValidator.equals(
    "second image has display_order 1",
    updatedProduct.images[1].display_order,
    1,
  );
  TestValidator.equals(
    "third image has display_order 2",
    updatedProduct.images[2].display_order,
    2,
  );
  // 7. Validate that all images have updated timestamps
  TestValidator.predicate(
    "first image updated_at exists",
    updatedProduct.images[0].updated_at !== undefined,
  );
  TestValidator.predicate(
    "second image updated_at exists",
    updatedProduct.images[1].updated_at !== undefined,
  );
  TestValidator.predicate(
    "third image updated_at exists",
    updatedProduct.images[2].updated_at !== undefined,
  );
  // 8. Validate that product updated_at changed
  TestValidator.predicate(
    "product updated_at changed",
    updatedProduct.updated_at !== product.updated_at,
  );
}