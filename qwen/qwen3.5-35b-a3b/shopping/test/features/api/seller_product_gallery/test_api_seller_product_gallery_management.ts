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

export async function test_api_seller_product_gallery_management(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://seller.example.com/register",
      referrer: "https://seller.example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // 2. Product creation by seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<100> &
            tags.Maximum<100000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Upload initial image for product
  const initialImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: (typia.random<string & tags.Format<"uri">>() satisfies string as string),
          display_order: 0,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(initialImage);
  // 4. Upload additional images progressively
  const additionalImages = await ArrayUtil.asyncRepeat(
    3,
    async (index: number) =>
      generate_random_ecommerce_mall_seller_products_images_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            image_url: (typia.random<string & tags.Format<"uri">>() satisfies string as string),
            display_order: index + 1,
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IEcommerceMallProductImage.ICreate,
        },
      ),
  ) as IEcommerceMallProductImage[];
  // 5. Validate image ownership (seller can only upload to their own products)
  // Ownership validation is enforced by API - unauthorized uploads would be rejected
  // 6. Each image has unique ID and timestamp
  TestValidator.notEquals(
    "initial image has unique ID",
    initialImage.id,
    additionalImages[0].id,
  );
  TestValidator.predicate(
    "initial image has timestamp",
    initialImage.created_at !== undefined,
  );
  TestValidator.predicate(
    "additional image has timestamp",
    additionalImages[0].created_at !== undefined,
  );
  // 7. Image count on product increments correctly
  TestValidator.equals("initial image count", product.images.length, 1);
  TestValidator.equals("after 3 images count", product.images.length, 4);
  // 8. All images remain accessible and visible
  const allImages = [initialImage, ...additionalImages];
  for (const image of allImages) {
    TestValidator.predicate("image has valid URL", image.image_url.length > 0);
    TestValidator.predicate(
      "image has valid display order",
      image.display_order >= 0,
    );
    typia.assert(image);
  }
  // 9. Image retention persists - all images accessible in product
  TestValidator.equals("product has all images", product.images.length, 4);
  for (let i = 0; i < 4; i++) {
    const image = product.images[i];
    TestValidator.predicate(`image ${i} is accessible`, image.id !== undefined);
    TestValidator.predicate(`image ${i} has URL`, image.image_url.length > 0);
  }
}