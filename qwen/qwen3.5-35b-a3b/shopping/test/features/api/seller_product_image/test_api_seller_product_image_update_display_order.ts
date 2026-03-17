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

export async function test_api_seller_product_image_update_display_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // Create new seller connection with token from authorization
  const sellerApiConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerAuthorized.token.access },
  };
  // 2. Setup: Generate a random product for seller
  const randomCategory: IEcommerceMallCategory.ISummary =
    typia.random<IEcommerceMallCategory.ISummary>();
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerApiConnection,
    {
      body: {
        name: typia.random<string>(),
        description: typia.random<
          string & tags.MaxLength<500>
        >() satisfies string as string,
        category_id: randomCategory.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >() satisfies number as number,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Setup: Upload first image with display_order 0 (initial primary)
  const image1 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerApiConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: RandomGenerator.alphaNumeric(32),
          display_order: 0,
          alt_text: typia.random<
            string & tags.MaxLength<2000>
          >() satisfies string as string,
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image1);
  // 4. Setup: Upload second image with display_order 1
  const image2 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerApiConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: RandomGenerator.alphaNumeric(32),
          display_order: 1,
          alt_text: typia.random<
            string & tags.MaxLength<2000>
          >() satisfies string as string,
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image2);
  // 5. Setup: Upload third image with display_order 2
  const image3 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerApiConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: RandomGenerator.alphaNumeric(32),
          display_order: 2,
          alt_text: typia.random<
            string & tags.MaxLength<2000>
          >() satisfies string as string,
        } satisfies IEcommerceMallProductImage.ICreate,
      },
    );
  typia.assert(image3);
  // Verify initial state: 3 images with sequential display_order 0, 1, 2
  TestValidator.equals("image1 display_order", image1.display_order, 0);
  TestValidator.equals("image2 display_order", image2.display_order, 1);
  TestValidator.equals("image3 display_order", image3.display_order, 2);
  // 6. Test: Update image2 (display_order 1) to 0, making it the new primary thumbnail
  const updatedImage2 =
    await api.functional.ecommerceMall.seller.products.images.update(
      sellerApiConnection,
      {
        productId: product.id,
        imageId: image2.id,
        body: {
          display_order: 0,
        } satisfies IEcommerceMallProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage2);
  // 7. Validate: Updated image should have display_order 0
  TestValidator.equals(
    "updated image2 display_order",
    updatedImage2.display_order,
    0,
  );
  TestValidator.equals(
    "updated image2 id matches",
    updatedImage2.id,
    image2.id,
  );
  // 8. Validate: Verify display_order is now 0 (core functionality test)
  TestValidator.equals(
    "display_order is now 0",
    updatedImage2.display_order,
    0,
  );
}