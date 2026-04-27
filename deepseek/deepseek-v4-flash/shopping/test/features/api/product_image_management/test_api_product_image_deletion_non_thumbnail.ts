import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_images_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_images_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Test that a seller can successfully delete a non-thumbnail image from their product.
 *
 * Validates the product image deletion workflow for a non-thumbnail image. The seller joins the platform, creates a product, uploads three images (first becomes thumbnail, second becomes a non-thumbnail image, third becomes another non-thumbnail image), then deletes the second image.
 *
 * Since no GET product detail endpoint is available in the SDK, deletion success is validated through idempotency: the first delete completes without error, and a subsequent delete of the same image fails with an HTTP 404 error confirming the image was hard-deleted.
 *
 * 1. Seller joins the platform and authenticates.
 * 2. Seller creates a product.
 * 3. Seller uploads three images to the product.
 * 4. Seller deletes the second (non-thumbnail) image.
 * 5. Verifies the deleted image cannot be deleted again (404 Not Found).
 */
export async function test_api_product_image_deletion_non_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join seller and create connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Upload 3 images
  // - Image 1: sort_order=0 (thumbnail)
  // - Image 2: sort_order=1 (non-thumbnail, to be deleted)
  // - Image 3: sort_order=2 (non-thumbnail, should remain after deletion)
  const image1 =
    await generate_random_e_commerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image1);
  TestValidator.equals("image1 is thumbnail", image1.sort_order, 0);
  const image2 =
    await generate_random_e_commerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image2);
  TestValidator.equals("image2 is non-thumbnail", image2.sort_order, 1);
  const image3 =
    await generate_random_e_commerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image3);
  TestValidator.equals("image3 is non-thumbnail", image3.sort_order, 2);
  // 4. Delete the non-thumbnail image (image2, sort_order=1)
  await api.functional.eCommerceMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: image2.id,
    },
  );
  // 5. Validate: trying to delete the same image again should fail with 404
  //    since the image was hard-deleted
  await TestValidator.httpError(
    "deleted image is no longer accessible",
    404,
    async () => {
      await api.functional.eCommerceMall.seller.products.images.erase(
        sellerConnection,
        {
          productId: product.id,
          imageId: image2.id,
        },
      );
    },
  );
}
