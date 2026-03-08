import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
import { generate_random_ecommerce_mall_seller_products_images_upload_images } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_upload_images";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

export async function test_api_product_image_upload_maximum_capacity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Upload 19 images to reach boundary (before maximum of 20)
  // Track the product ID from the first successful upload
  let productId: (string & tags.Format<"uuid">) | null = null;
  const imagesAt19: IEcommerceMallProductImage.ISummary[] = [];
  for (let i = 0; i < 19; i++) {
    const image =
      await generate_random_ecommerce_mall_seller_products_images_upload_images(
        sellerConnection,
        {
          params: productId ? { productId } : undefined,
          body: {
            image_url: typia.random<
              string & tags.Format<"uri"> & tags.MaxLength<80000>
            >(),
          } satisfies IEcommerceMallProductImage.ICreate,
        },
      );
    typia.assert(image);
    if (productId === null) {
      productId = image.product.id;
    }
    imagesAt19.push(image);
  }
  // 3. Verify 19th image has display_order 19
  TestValidator.equals(
    "19th image display order",
    imagesAt19[18].display_order,
    19,
  );
  // 4. Upload 1 more image to reach maximum of 20
  const imageAt20: IEcommerceMallProductImage.ISummary =
    await generate_random_ecommerce_mall_seller_products_images_upload_images(
      sellerConnection,
      {
        params: { productId: productId! },
        body: {
          image_url: typia.random<
            string & tags.Format<"uri"> & tags.MaxLength<80000>
          >(),
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(imageAt20);
  // 5. Verify the 20th image has display_order 20
  TestValidator.equals("20th image display order", imageAt20.display_order, 20);
  // 6. Attempt to upload another image (would exceed 20 limit)
  // Should return 409 Conflict error
  await TestValidator.error(
    "should reject 21st image (409 Conflict)",
    async () => {
      await generate_random_ecommerce_mall_seller_products_images_upload_images(
        sellerConnection,
        {
          params: { productId: productId! },
          body: {
            image_url: typia.random<
              string & tags.Format<"uri"> & tags.MaxLength<80000>
            >(),
          } satisfies IEcommerceMallProductImage.ICreate,
        },
      );
    },
  );
  // 7. Verify the 20 existing images are not affected by the failed upload
  TestValidator.equals(
    "product_id consistent",
    imageAt20.product.id,
    productId!,
  );
}