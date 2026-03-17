import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_image_retrieve_owned_current_gallery_record(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 100,
          status: "active",
        },
      },
    );
  typia.assert(product);
  const image =
    await generate_random_shopping_mall_seller_seller_products_images_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          image_uri: typia.random<string & tags.Format<"uri">>(),
          sequence: 1,
          is_thumbnail: true,
        },
      },
    );
  typia.assert(image);
  const retrieved =
    await api.functional.shoppingMall.seller.seller_products.images.at(
      sellerConnection,
      {
        productId: product.id,
        imageId: image.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved image id matches created image",
    retrieved.id,
    image.id,
  );
  TestValidator.equals(
    "retrieved image uri matches created image",
    retrieved.image_uri,
    image.image_uri,
  );
  TestValidator.equals(
    "retrieved gallery sequence matches current resolved sequence",
    retrieved.sequence,
    image.sequence,
  );
  TestValidator.equals(
    "retrieved thumbnail flag matches current state",
    retrieved.is_thumbnail,
    image.is_thumbnail,
  );
  TestValidator.equals(
    "retrieved parent product id matches created product",
    retrieved.product.id,
    product.id,
  );
  TestValidator.equals(
    "retrieved parent product name matches created product",
    retrieved.product.name,
    product.name,
  );
  TestValidator.equals(
    "retrieved parent product description matches created product",
    retrieved.product.description,
    product.description,
  );
  TestValidator.equals(
    "retrieved parent product base price matches created product",
    retrieved.product.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "retrieved parent product status matches created product",
    retrieved.product.status,
    product.status,
  );
  TestValidator.equals(
    "retrieved parent product seller id matches seller owner",
    retrieved.product.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "retrieved parent product seller email matches seller owner",
    retrieved.product.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "retrieval does not change image ordering",
    retrieved.sequence,
    image.sequence,
  );
  TestValidator.equals(
    "retrieval does not change thumbnail state",
    retrieved.is_thumbnail,
    image.is_thumbnail,
  );
}
