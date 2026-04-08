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

export async function test_api_seller_product_images_reorder_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // 2. Create a product
  const sellerProductConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerProductConnection, {
    body: {
      email: sellerAuthorized.email,
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerProductConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload 3 images with display_order 1, 2, 3
  const image1 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerProductConnection,
      {
        body: {
          image_url: "https://example.com/image1.jpg",
          display_order: 1,
        } satisfies IEcommerceMallProductImage.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerProductConnection,
      {
        body: {
          image_url: "https://example.com/image2.jpg",
          display_order: 2,
        } satisfies IEcommerceMallProductImage.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerProductConnection,
      {
        body: {
          image_url: "https://example.com/image3.jpg",
          display_order: 3,
        } satisfies IEcommerceMallProductImage.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(image3);
  // Verify initial state
  TestValidator.equals(
    "image1 display_order should be 1",
    image1.display_order,
    1,
  );
  TestValidator.equals(
    "image2 display_order should be 2",
    image2.display_order,
    2,
  );
  TestValidator.equals(
    "image3 display_order should be 3",
    image3.display_order,
    3,
  );
  // 4. Reorder images by calling PATCH with image IDs in reverse order [image3, image2, image1]
  const reorderResponse =
    await api.functional.ecommerceMall.seller.products.images.reorder.patchByProductid(
      sellerProductConnection,
      {
        productId: product.id,
        body: {
          image_ids: [image3.id, image2.id, image1.id] satisfies (string &
            tags.Format<"uuid">)[],
        } satisfies IEcommerceMallProduct.IReorder,
      },
    );
  typia.assert(reorderResponse);
  // 5. Validate response images array has 3 items
  TestValidator.equals(
    "images array should have 3 items",
    reorderResponse.images.length,
    3,
  );
  // 6. Verify response images array is sorted by display_order ascending
  const images = reorderResponse.images;
  TestValidator.equals(
    "first image should have display_order 1",
    images[0].display_order,
    1,
  );
  TestValidator.equals(
    "second image should have display_order 2",
    images[1].display_order,
    2,
  );
  TestValidator.equals(
    "third image should have display_order 3",
    images[2].display_order,
    3,
  );
  // 7. Verify the first image in response is image3 (was 3, now 1)
  TestValidator.equals(
    "first image in reordered list should be image3",
    images[0].id,
    image3.id,
  );
  TestValidator.equals(
    "second image in reordered list should be image2",
    images[1].id,
    image2.id,
  );
  TestValidator.equals(
    "third image in reordered list should be image1",
    images[2].id,
    image1.id,
  );
  // 8. Verify the new main image (display_order=1) is image3
  TestValidator.equals(
    "main thumbnail should be image3 (display_order 1)",
    images[0].id,
    image3.id,
  );
  // 9. Verify product relation in images is correct
  for (const image of images) {
    TestValidator.equals(
      `image ${image.id} should reference product`,
      image.product.id,
      product.id,
    );
  }
}
