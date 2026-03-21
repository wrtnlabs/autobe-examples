import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test that an authenticated seller can successfully change the display order of their product image.
 *
 * Scenario:
 * 1. Create and authenticate a seller account with approved status
 * 2. Create a product that the seller owns
 * 3. Upload the first image to the product (this becomes main thumbnail with display_order=0)
 * 4. Upload a second image to create a gallery (display_order=1)
 * 5. Update the second image to have display_order=0 (making it the new main thumbnail)
 * 6. Verify that:
 *    - The image_url remains unchanged for both images
 *    - The updated image's display_order is now 0
 *    - The first image's display_order is adjusted to 1
 *
 * This validates the image reordering business rule where the first image (display_order=0)
 * serves as the main thumbnail in product listings.
 */
export async function test_api_product_image_reorder_to_main_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Upload the first image to the product (becomes main thumbnail with display_order=0)
  const firstImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(firstImage);
  // Validate first image has display_order=0 (main thumbnail)
  TestValidator.equals(
    "first image display_order is 0",
    firstImage.display_order,
    0,
  );
  // Store original image URLs for validation
  const firstImageUrl = firstImage.image_url;
  const firstImageId = firstImage.id;
  // 4. Upload the second image (display_order=1)
  const secondImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(secondImage);
  // Validate second image has display_order=1
  TestValidator.equals(
    "second image display_order is 1",
    secondImage.display_order,
    1,
  );
  // Store second image info for validation
  const secondImageUrl = secondImage.image_url;
  const secondImageId = secondImage.id;
  // 5. Update the second image to have display_order=0 (make it the new main thumbnail)
  const updatedSecondImage =
    await api.functional.ecommerceMall.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: secondImageId,
        body: {
          display_order: 0 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0>,
        } satisfies IEcommerceMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedSecondImage);
  // 6. Validate the updated second image
  TestValidator.equals(
    "updated image URL unchanged",
    updatedSecondImage.image_url,
    secondImageUrl,
  );
  TestValidator.equals(
    "second image is now main thumbnail (display_order=0)",
    updatedSecondImage.display_order,
    0,
  );
  // 7. Update the first image to have display_order=1 (shift down)
  // This completes the swap - first image becomes position 1, second becomes position 0
  const updatedFirstImage =
    await api.functional.ecommerceMall.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: firstImageId,
        body: {
          display_order: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0>,
        } satisfies IEcommerceMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedFirstImage);
  // 8. Final validation - both images have correct display_order after swap
  TestValidator.equals(
    "first image URL unchanged",
    updatedFirstImage.image_url,
    firstImageUrl,
  );
  TestValidator.equals(
    "first image now at position 1",
    updatedFirstImage.display_order,
    1,
  );
  TestValidator.equals(
    "second image still at position 0",
    updatedSecondImage.display_order,
    0,
  );
}
