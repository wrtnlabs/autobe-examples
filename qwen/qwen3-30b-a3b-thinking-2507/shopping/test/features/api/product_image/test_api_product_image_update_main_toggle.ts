import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
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

export async function test_api_product_image_update_main_toggle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IEcommerceSeller.IJoin,
  });
  // 2. Create a product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: RandomGenerator.alphaNumeric(32),
        base_price: typia.random<number & tags.Minimum<0.01>>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  // 3. Add first image (position 0 = auto main)
  const initialImage =
    await generate_random_ecommerce_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: `https://example.com/${RandomGenerator.alphaNumeric(10)}.jpg`,
          position: 0,
          is_main: true,
        } satisfies IEcommerceProductImage.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  // 4. Add second image (position 1 = auto not main)
  const secondImage =
    await generate_random_ecommerce_seller_products_images_create(
      sellerConnection,
      {
        body: {
          image_url: `https://example.com/${RandomGenerator.alphaNumeric(10)}.jpg`,
          position: 1,
        } satisfies IEcommerceProductImage.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  // 5. Update second image to be main
  const updatedImage =
    await api.functional.ecommerce.seller.products.images.update(
      sellerConnection,
      {
        body: {
          image_url: secondImage.image_url,
          is_main: true,
          position: secondImage.position satisfies number as number,
        } satisfies IEcommerceProductImage.IUpdate,
        productId: product.id,
        imageId: secondImage.id,
      },
    );
  typia.assert(updatedImage);
  // 6. Verify both images' main status
  TestValidator.predicate("second image is now main", updatedImage.is_main);
  TestValidator.predicate(
    "initial image is no longer main",
    !initialImage.is_main,
  );
}