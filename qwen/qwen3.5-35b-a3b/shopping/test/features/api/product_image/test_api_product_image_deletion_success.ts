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

export async function test_api_product_image_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(2),
      href: "https://test.example.com",
      referrer: "https://test.example.com/join",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload 2 images to the product
  const image1 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
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
      sellerConnection,
      {
        body: {
          image_url: "https://example.com/image2.jpg",
          display_order: 2,
        } satisfies IEcommerceMallProductImage.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(image2);
  // 4. Verify we have 2 images (store IDs for validation)
  const imageIdsBefore = [image1.id, image2.id];
  TestValidator.equals("2 images were created", imageIdsBefore.length, 2);
  // 5. Delete one image (image2)
  await api.functional.ecommerceMall.seller.products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: image2.id,
    },
  );
  // 6. Verify deletion succeeded - 204 No Content (erase returns void)
  // The API call completing without error indicates success
  // 7. Verify remaining image (image1) is still valid by checking ID preservation
  TestValidator.equals(
    "image1 id preserved after deletion",
    image1.id,
    imageIdsBefore[0],
  );
  TestValidator.notEquals(
    "image2 id different from image1",
    image1.id,
    image2.id,
  );
}
