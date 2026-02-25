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

export async function test_api_product_image_add_as_main_with_previous_toggle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEcommerceSeller.IJoin,
  });
  // 2. Create product connection
  const productConnection: api.IConnection = { host: connection.host };
  productConnection.headers = {
    Authorization: `Bearer ${seller.token.access}`,
  };
  // 3. Create product
  const product = await generate_random_ecommerce_seller_products_create(
    productConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.content({ paragraphs: 1 }),
        category_id: typia.random<string & tags.Format<"uuid">>() satisfies IEcommerceProduct.ICreate["category_id"],
        base_price: typia.random<number & tags.Minimum<0.01>>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  // 4. Add first image (position 0 - auto-marks as main)
  const firstImage =
    await generate_random_ecommerce_seller_products_images_create(
      productConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: `https://example.com/image1.jpg`,
          position: 0 satisfies number as number,
        } satisfies IEcommerceProductImage.ICreate,
      },
    );
  typia.assert(firstImage);
  // 5. Add second image as main (position 1 with is_main=true)
  const secondImage =
    await generate_random_ecommerce_seller_products_images_create(
      productConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: `https://example.com/image2.jpg`,
          position: 1 satisfies number as number,
          is_main: true,
        } satisfies IEcommerceProductImage.ICreate,
      },
    );
  typia.assert(secondImage);
  // 6. Validate main image status
  TestValidator.equals("second image is main", secondImage.is_main, true);
  TestValidator.equals("first image no longer main", firstImage.is_main, false);
}