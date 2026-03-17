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

export async function test_api_product_image_removed_from_active_gallery(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  const productBody = {
    shopping_mall_category_id: null,
    name: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 2 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >() satisfies number as number,
    status: "active",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: productBody,
      },
    );
  typia.assert(product);
  TestValidator.equals(
    "product name matches input",
    product.name,
    productBody.name,
  );
  TestValidator.equals(
    "product status matches input",
    product.status,
    productBody.status,
  );
  const imageBody = {
    image_uri: typia.random<string & tags.Format<"uri">>(),
    sequence: 1,
    is_thumbnail: true,
  } satisfies IShoppingMallProductImage.ICreate;
  const createdImage: IShoppingMallProductImage =
    await generate_random_shopping_mall_seller_seller_products_images_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: imageBody,
      },
    );
  typia.assert(createdImage);
  TestValidator.equals(
    "image belongs to product",
    createdImage.product.id,
    product.id,
  );
  TestValidator.equals(
    "image uri matches input",
    createdImage.image_uri,
    imageBody.image_uri,
  );
  await api.functional.shoppingMall.seller.seller_products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: createdImage.id,
    },
  );
  await TestValidator.httpError(
    "removed image is not retrievable from active gallery",
    [404, 410, 422],
    async () => {
      await api.functional.shoppingMall.products.images.at(sellerConnection, {
        productId: product.id,
        imageId: createdImage.id,
      });
    },
  );
}
