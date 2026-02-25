import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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

export async function test_api_product_image_gallery_multiple_order(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and register
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.paragraph({ sentences: 2 }),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Create a product for image uploads
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 8,
        }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >() satisfies number as number,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Upload images with specific positions to test ordering
  const imageUrls = ArrayUtil.repeat(
    3,
    (index) =>
      `https://example.com/images/image-${index + 1}.jpg` satisfies string &
        tags.Format<"uri">,
  );
  // Upload images in specific order: position 3, then 1, then 2
  const image3 = await generate_random_ecommerce_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product.id },
      body: {
        image_url: imageUrls[2],
        position:
          (typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >() satisfies number as number) === 3
            ? 3
            : 3,
      } satisfies IEcommerceProductImage.ICreate,
    },
  );
  typia.assert(image3);
  TestValidator.equals("image3 position", image3.position, 3);
  const image1 = await generate_random_ecommerce_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product.id },
      body: {
        image_url: imageUrls[0],
        position:
          (typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >() satisfies number as number) === 1
            ? 1
            : 1,
      } satisfies IEcommerceProductImage.ICreate,
    },
  );
  typia.assert(image1);
  TestValidator.equals("image1 position", image1.position, 1);
  const image2 = await generate_random_ecommerce_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product.id },
      body: {
        image_url: imageUrls[1],
        position:
          (typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >() satisfies number as number) === 2
            ? 2
            : 2,
      } satisfies IEcommerceProductImage.ICreate,
    },
  );
  typia.assert(image2);
  TestValidator.equals("image2 position", image2.position, 2);
  // Validate that image1 (lowest position) should be considered the primary thumbnail
  TestValidator.equals("first image is position 1", image1.position, 1);
  TestValidator.predicate(
    "position 1 is lowest",
    image1.position < image2.position && image1.position < image3.position,
  );
  // Validate gallery ordering by checking positions
  TestValidator.predicate(
    "positions are sequential",
    image1.position === 1 && image2.position === 2 && image3.position === 3,
  );
  // Validate image URLs match the uploaded images
  TestValidator.equals("image1 URL", image1.image_url, imageUrls[0]);
  TestValidator.equals("image2 URL", image2.image_url, imageUrls[1]);
  TestValidator.equals("image3 URL", image3.image_url, imageUrls[2]);
  // Validate all images belong to the same product
  TestValidator.equals("image1 product ID", image1.product.id, product.id);
  TestValidator.equals("image2 product ID", image2.product.id, product.id);
  TestValidator.equals("image3 product ID", image3.product.id, product.id);
  // Validate creation timestamps are in correct order of upload
  TestValidator.predicate(
    "images created in correct order",
    new Date(image1.created_at) < new Date(image2.created_at) &&
      new Date(image2.created_at) < new Date(image3.created_at),
  );
}
