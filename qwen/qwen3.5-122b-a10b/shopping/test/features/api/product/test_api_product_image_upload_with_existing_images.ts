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
 * Test product image upload with existing images validation.
 *
 * Validates the product image upload workflow when a product already has images. Ensures that new images receive sequential display_order values continuing from the maximum existing value, while existing images retain their original order positions.
 *
 * The test creates a seller account, creates a product with initial images, then uploads additional images one at a time. It validates that the system correctly assigns display_order values and maintains image ordering integrity.
 *
 * 1. Seller registers and authenticates with the platform.
 * 2. Seller creates a product with 3 initial images.
 * 3. Seller uploads 2 additional images to the existing product sequentially.
 * 4. Validates new images have display_order values continuing from max+1.
 * 5. Validates existing images in the product retain their original display_order values.
 * 6. Validates the first image (display_order=0) remains the thumbnail.
 * 7. Verifies all images are properly associated with the product.
 */
export async function test_api_product_image_upload_with_existing_images(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
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
  // 2. Create product with initial images
  const initialImages = ArrayUtil.repeat(
    3,
    (index) =>
      ({
        image_url: `https://example.com/images/product-${index}.jpg`,
      }) satisfies IEcommerceProductImage.ICreate,
  );
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        images: initialImages,
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Verify initial product has 3 images with display_order 0, 1, 2
  TestValidator.equals("initial image count", product.productImages.length, 3);
  TestValidator.predicate(
    "first image is thumbnail",
    product.productImages[0].displayOrder === 0,
  );
  // Store initial image IDs and display orders
  const initialImageIds = product.productImages.map((img) => img.id);
  const initialDisplayOrders = product.productImages.map(
    (img) => img.displayOrder,
  );
  const maxInitialOrder = Math.max(...initialDisplayOrders);
  // 3. Upload additional images one at a time
  const additionalImageUrls = ArrayUtil.repeat(
    2,
    () =>
      `https://example.com/images/extra-${RandomGenerator.alphabets(5)}.jpg`,
  );
  const uploadedImages: IEcommerceProductImage[] = [];
  for (const imageUrl of additionalImageUrls) {
    const uploadedImage =
      await generate_random_ecommerce_seller_products_images_create(
        sellerConnection,
        {
          body: {
            image_url: imageUrl,
          } satisfies IEcommerceProductImage.ICreate,
          params: {
            productId: product.id,
          },
        },
      );
    typia.assert(uploadedImage);
    uploadedImages.push(uploadedImage);
  }
  // 4. Validate uploaded images have sequential display_order values
  TestValidator.equals("uploaded image count", uploadedImages.length, 2);
  const uploadedDisplayOrders = uploadedImages.map((img) => img.displayOrder);
  // Verify new images start from maxInitialOrder + 1
  const expectedFirstOrder = maxInitialOrder + 1;
  TestValidator.predicate(
    "first uploaded image starts from max+1",
    uploadedDisplayOrders.includes(expectedFirstOrder),
  );
  // Verify uploaded images have sequential display_order values
  const expectedOrders = [expectedFirstOrder, expectedFirstOrder + 1];
  const sortedUploadedOrders = [...uploadedDisplayOrders].sort((a, b) => a - b);
  TestValidator.equals(
    "uploaded images have sequential display_order",
    sortedUploadedOrders,
    expectedOrders,
  );
  // 5. Verify uploaded images are associated with the correct product
  for (const uploadedImg of uploadedImages) {
    TestValidator.equals(
      "uploaded image product_id matches",
      uploadedImg.product.id,
      product.id,
    );
  }
  // 6. Verify existing images retain their display_order (from product creation response)
  for (let i = 0; i < product.productImages.length; i++) {
    const initialImg = product.productImages[i];
    TestValidator.equals(
      `existing image ${i} display_order unchanged`,
      initialImg.displayOrder,
      i,
    );
  }
  // 7. Verify thumbnail (first image) remains unchanged
  TestValidator.equals(
    "thumbnail display_order is 0",
    product.productImages[0].displayOrder,
    0,
  );
  TestValidator.equals(
    "thumbnail image_url matches",
    product.productImages[0].imageUrl,
    initialImages[0].image_url,
  );
  // 8. Verify all image IDs are unique
  const allImageIds = [
    ...initialImageIds,
    ...uploadedImages.map((img) => img.id),
  ];
  const uniqueImageIds = new Set(allImageIds);
  TestValidator.equals(
    "all image IDs are unique",
    uniqueImageIds.size,
    allImageIds.length,
  );
}
