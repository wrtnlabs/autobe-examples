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

export async function test_api_seller_image_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IEcommerceSeller.IJoin,
  });
  // 2. Create product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Add image to product
  const image = await generate_random_ecommerce_seller_products_images_create(
    sellerConnection,
    {
      body: {
        image_url: typia.random<string & tags.Format<"url">>(),
        position: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
        is_main: true,
      } satisfies IEcommerceProductImage.ICreate,
      params: {
        productId: product.id,
      },
    },
  );
  typia.assert(image);
  // 4. Retrieve image metadata
  const retrievedImage =
    await api.functional.ecommerce.seller.products.images.at(sellerConnection, {
      productId: product.id,
      imageId: image.id,
    });
  typia.assert(retrievedImage);
  // Validate expected fields
  TestValidator.equals(
    "image_url matches",
    retrievedImage.image_url,
    image.image_url,
  );
  TestValidator.equals(
    "is_main matches",
    retrievedImage.is_main,
    image.is_main,
  );
  TestValidator.equals(
    "position matches",
    retrievedImage.position,
    image.position,
  );
  TestValidator.equals("deleted_at is null", retrievedImage.deleted_at, null);
}
