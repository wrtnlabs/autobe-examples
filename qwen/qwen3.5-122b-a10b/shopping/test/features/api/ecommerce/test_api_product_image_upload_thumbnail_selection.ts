import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_images_create } from "../../../generate/generate_random_ecommerce_seller_products_images_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test thumbnail selection when uploading images to a product.
 *
 * Validates that the first image uploaded to a product becomes the main thumbnail (display_order = 0) shown in product listings and search results. When additional images are uploaded, they are appended with higher display_order values and do not affect the existing thumbnail.
 *
 * The test verifies that the product's productImages array correctly orders images by display_order, with the first image (display_order = 0) serving as the thumbnail reference.
 *
 * 1. Authenticate seller account with random credentials.
 * 2. Create a product without initial images.
 * 3. Upload first image and verify it has display_order = 0.
 * 4. Upload second image and verify it has display_order = 1.
 * 5. Validate product images are correctly ordered with first image as thumbnail.
 */
export async function test_api_product_image_upload_thumbnail_selection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create a product without images
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        images: [], // No initial images
      },
    },
  );
  typia.assert(product);
  // Verify product has no images initially
  TestValidator.equals(
    "product has no images initially",
    product.productImages.length,
    0,
  );
  // 3. Upload first image - should become thumbnail (display_order = 0)
  const firstImage =
    await generate_random_ecommerce_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: `https://example.com/images/first-${typia.random<string & tags.Format<"uuid">>()}.jpg`,
        } satisfies IEcommerceProductImage.ICreate,
      },
    );
  typia.assert(firstImage);
  // Verify first image has display_order = 0
  TestValidator.equals(
    "first image display_order is 0",
    firstImage.displayOrder,
    0,
  );
  // Verify product now has the first image
  TestValidator.equals(
    "product has 1 image after first upload",
    product.productImages.length,
    1,
  );
  TestValidator.equals(
    "first image matches product image",
    product.productImages[0].imageUrl,
    firstImage.imageUrl,
  );
  TestValidator.equals(
    "product image display_order is 0",
    product.productImages[0].displayOrder,
    0,
  );
  // 4. Upload second image - should NOT become thumbnail (display_order = 1)
  const secondImage =
    await generate_random_ecommerce_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: `https://example.com/images/second-${typia.random<string & tags.Format<"uuid">>()}.jpg`,
        } satisfies IEcommerceProductImage.ICreate,
      },
    );
  typia.assert(secondImage);
  // Verify second image has display_order = 1
  TestValidator.equals(
    "second image display_order is 1",
    secondImage.displayOrder,
    1,
  );
  // Verify product now has 2 images
  TestValidator.equals(
    "product has 2 images after second upload",
    product.productImages.length,
    2,
  );
  // Verify both images exist with correct display orders
  const firstProductImage = product.productImages.find(
    (img) => img.displayOrder === 0,
  );
  const secondProductImage = product.productImages.find(
    (img) => img.displayOrder === 1,
  );
  TestValidator.equals(
    "image at display_order 0 exists",
    firstProductImage !== undefined,
    true,
  );
  TestValidator.equals(
    "image at display_order 1 exists",
    secondProductImage !== undefined,
    true,
  );
  TestValidator.equals(
    "display_order 0 image is first image",
    firstProductImage?.imageUrl,
    firstImage.imageUrl,
  );
  TestValidator.equals(
    "display_order 1 image is second image",
    secondProductImage?.imageUrl,
    secondImage.imageUrl,
  );
  // Verify first image (display_order = 0) is the thumbnail
  TestValidator.equals(
    "first image is at position 0 in array",
    product.productImages[0].imageUrl,
    firstImage.imageUrl,
  );
  TestValidator.equals(
    "second image is at position 1 in array",
    product.productImages[1].imageUrl,
    secondImage.imageUrl,
  );
}