import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
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

export async function test_api_product_images_reorder_on_upload(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(2),
      href: "https://test.com/seller/join",
      referrer: "https://test.com/register",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // 2. Create product for image uploads
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product for Image Reordering",
        description: "Testing image reordering functionality",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Upload first image with display_order=1
  const image1 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: "https://test.com/images/image1.jpg",
          display_order: 1,
        },
        params: { productId: product.id },
      },
    );
  typia.assert(image1);
  // 4. Upload second image with display_order=2
  const image2 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: "https://test.com/images/image2.jpg",
          display_order: 2,
        },
        params: { productId: product.id },
      },
    );
  typia.assert(image2);
  // 5. Upload third image with display_order=3
  const image3 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: "https://test.com/images/image3.jpg",
          display_order: 3,
        },
        params: { productId: product.id },
      },
    );
  typia.assert(image3);
  // 6. Upload new image with display_order=1 (should trigger reordering)
  const newImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: "https://test.com/images/new_image.jpg",
          display_order: 1,
        },
        params: { productId: product.id },
      },
    );
  typia.assert(newImage);
  // 7. Verify new image was created with display_order=1
  TestValidator.equals(
    "new image has display_order=1",
    newImage.display_order,
    1,
  );
  TestValidator.equals(
    "new image has correct URL",
    newImage.image_url,
    "https://test.com/images/new_image.jpg",
  );
  // 8. Verify product has 4 images total
  TestValidator.equals(
    "product has 4 images after all uploads",
    product.images.length,
    4,
  );
  // 9. Verify images are in correct order: 1, 2, 3, 4
  const imageOrders = product.images.map((i) => i.display_order).sort();
  TestValidator.equals(
    "images have display_orders 1, 2, 3, 4",
    imageOrders,
    [1, 2, 3, 4],
  );
  // 10. Verify first image (main thumbnail) is the newly uploaded one
  const firstImage = product.images.find((i) => i.display_order === 1);
  TestValidator.equals(
    "first image is the newly uploaded one",
    firstImage?.image_url,
    "https://test.com/images/new_image.jpg",
  );
}
