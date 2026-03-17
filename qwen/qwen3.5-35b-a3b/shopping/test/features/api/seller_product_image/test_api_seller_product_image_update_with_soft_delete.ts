import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
 * Test that sellers cannot update soft-deleted product images.
 * 1. Seller registers and authenticates
 * 2. Seller creates a product
 * 3. Seller uploads two images to the product
 * 4. Seller soft-deletes one image
 * 5. Attempt to update the soft-deleted image (should fail with 410)
 * 6. Verify the active image can still be updated
 */
export async function test_api_seller_product_image_update_with_soft_delete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // 3. Upload two images
  const image1 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: `https://example.com/image1.jpg`,
          display_order: 0,
          alt_text: null,
        },
        params: { productId: product.id },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: `https://example.com/image2.jpg`,
          display_order: 1,
          alt_text: "Secondary image",
        },
        params: { productId: product.id },
      },
    );
  typia.assert(image2);
  // 4. Soft-delete image1 using DELETE endpoint
  await api.functional.ecommerceMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: image1.id,
    },
  );
  // 5. Attempt to update the soft-deleted image - should return 410 Gone
  await TestValidator.error(
    "should reject update on soft-deleted image with 410",
    async () => {
      await api.functional.ecommerceMall.seller.products.images.update(
        sellerConnection,
        {
          productId: product.id,
          imageId: image1.id,
          body: {
            display_order: 99,
          } satisfies IEcommerceMallProductImage.IUpdate,
        },
      );
    },
  );
  // 6. Verify image2 can still be updated (active image)
  const updatedImage2 =
    await api.functional.ecommerceMall.seller.products.images.update(
      sellerConnection,
      {
        productId: product.id,
        imageId: image2.id,
        body: {
          alt_text: "Updated alt text",
        } satisfies IEcommerceMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage2);
  TestValidator.equals(
    "updated alt text matches",
    updatedImage2.alt_text,
    "Updated alt text",
  );
}
