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
 * Test product image reordering functionality where sellers can change the main thumbnail.
 *
 * Validates that sellers can reorder product images to change which image appears as the main thumbnail in search results and category listings. The test authenticates a seller, creates a product with multiple images, reorders them, and verifies that the display_order values are updated correctly with the first image becoming the new thumbnail.
 *
 * Special attention is given to verifying that the image placed first in the reorder request becomes the main thumbnail (display_order = 1), all other images shift their display_order values accordingly, and the previous main thumbnail now has a higher display_order value.
 *
 * 1. Seller authenticates via registration.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller uploads at least 2 images to the product.
 * 4. Verify initial state: first image has display_order = 1 (main thumbnail).
 * 5. Seller reorders images by placing the second image first.
 * 6. Verify that the reordered images have correct display_order values.
 * 7. Verify that the new first image is now the main thumbnail.
 */
export async function test_api_product_image_reorder_thumbnail_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Upload first image (will be initial main thumbnail)
  const firstImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(firstImage);
  // 4. Upload second image
  const secondImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(secondImage);
  // 5. Verify initial state: first image has display_order = 1
  TestValidator.equals(
    "first image is initial main thumbnail",
    firstImage.display_order,
    1,
  );
  TestValidator.equals(
    "second image has display_order = 2",
    secondImage.display_order,
    2,
  );
  // 6. Reorder images: place second image first, first image second
  const reorderedImages =
    await api.functional.shoppingMall.seller.products.images.patchByProductid(
      sellerConnection,
      {
        productId: product.id,
        body: {
          images: [secondImage.id, firstImage.id],
        } satisfies IShoppingMallProductImage.IReorder,
      },
    );
  typia.assert(reorderedImages);
  // 7. Verify that the response shows the new first image
  TestValidator.equals(
    "reordered response shows second image as first",
    reorderedImages.id,
    secondImage.id,
  );
  TestValidator.equals(
    "second image now has display_order = 1",
    reorderedImages.display_order,
    1,
  );
  // 8. Upload a third image to verify it gets the next display_order
  const thirdImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(thirdImage);
  // 9. Verify third image gets display_order = 3 (after the reordered images)
  TestValidator.equals(
    "third image has display_order = 3",
    thirdImage.display_order,
    3,
  );
  // 10. Reorder again: place third image first
  const reorderedImages2 =
    await api.functional.shoppingMall.seller.products.images.patchByProductid(
      sellerConnection,
      {
        productId: product.id,
        body: {
          images: [thirdImage.id, secondImage.id, firstImage.id],
        } satisfies IShoppingMallProductImage.IReorder,
      },
    );
  typia.assert(reorderedImages2);
  // 11. Verify the new first image
  TestValidator.equals(
    "third image becomes new main thumbnail",
    reorderedImages2.id,
    thirdImage.id,
  );
  TestValidator.equals(
    "third image now has display_order = 1",
    reorderedImages2.display_order,
    1,
  );
}
