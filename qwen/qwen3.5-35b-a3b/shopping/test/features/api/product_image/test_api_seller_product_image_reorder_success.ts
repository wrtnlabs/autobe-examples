import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductImageIReorderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImageIReorderItem";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductImage";
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

export async function test_api_seller_product_image_reorder_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Create product for seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Upload at least 3 images to the product
  const numImages = 3;
  const images = await ArrayUtil.asyncRepeat(numImages, async (index) =>
    generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: `https://example.com/images/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          display_order: index,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        },
        params: { productId: product.id },
      },
    ),
  );
  typia.assert(images);
  // 4. Reorder images by changing display_order values
  const reorderedItems = ArrayUtil.repeat(numImages, (index) => ({
    image_id: images[numImages - 1 - index].id,
    display_order: index,
  }));
  const reorderResponse =
    await api.functional.ecommerceMall.seller.products.images.reorder.patchByProductid(
      sellerConnection,
      {
        productId: product.id,
        body: {
          images: reorderedItems,
        } satisfies IEcommerceMallProductImage.IReorder,
      },
    );
  typia.assert(reorderResponse);
  // 5. Validate response contains all images
  const returnedImages = reorderResponse.data;
  TestValidator.equals("number of images", returnedImages.length, numImages);
  // 6. Validate all images have correct new display_order values
  for (let i = 0; i < numImages; i++) {
    const image = returnedImages.find(
      (img) => img.id === reorderedItems[i].image_id,
    );
    TestValidator.equals(
      `image ${i} display_order`,
      image!.display_order,
      reorderedItems[i].display_order,
    );
  }
  // 7. Validate first image (position 0) becomes main thumbnail
  const firstImage = returnedImages.find((img) => img.display_order === 0);
  TestValidator.predicate("first image exists", firstImage !== undefined);
  TestValidator.equals(
    "first image is correct",
    firstImage!.id,
    reorderedItems[0].image_id,
  );
  // 8. Validate all display_order values are unique and start from 0
  const displayOrders = returnedImages.map((img) => img.display_order);
  const uniqueOrders = new Set(displayOrders);
  TestValidator.equals("unique display orders", uniqueOrders.size, numImages);
  TestValidator.predicate("orders start from 0", displayOrders.includes(0));
}
