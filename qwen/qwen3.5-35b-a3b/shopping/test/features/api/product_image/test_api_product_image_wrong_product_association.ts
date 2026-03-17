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

export async function test_api_product_image_wrong_product_association(
  connection: api.IConnection,
): Promise<void> {
  // 1. First seller registration
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    seller1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(seller1);
  // 2. First seller creates product
  const seller1Product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      seller1Connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(seller1Product);
  // 3. First seller uploads image to their product
  const seller1Image: IEcommerceMallProductImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      seller1Connection,
      {
        body: {
          image_url: `https://example.com/images/${RandomGenerator.alphaNumeric(8)}.jpg`,
          display_order: 0,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        },
        params: { productId: seller1Product.id },
      },
    );
  typia.assert(seller1Image);
  // 4. Second seller registration
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    seller2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(seller2);
  // 5. Second seller creates product
  const seller2Product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      seller2Connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(seller2Product);
  // 6. Second seller uploads image to their product
  const seller2Image: IEcommerceMallProductImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      seller2Connection,
      {
        body: {
          image_url: `https://example.com/images/${RandomGenerator.alphaNumeric(8)}.jpg`,
          display_order: 0,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        },
        params: { productId: seller2Product.id },
      },
    );
  typia.assert(seller2Image);
  // 7. Attempt to retrieve seller1's image using seller2's product ID
  // This should fail because the image belongs to seller1's product, not seller2's
  await TestValidator.error(
    "image does not belong to specified product",
    async () => {
      await api.functional.ecommerceMall.products.images.at(seller2Connection, {
        productId: seller2Product.id,
        imageId: seller1Image.id,
      });
    },
  );
}
