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

export async function test_api_product_image_retrieve_forbidden_for_other_seller_product(
  connection: api.IConnection,
): Promise<void> {
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1Auth);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2Auth);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      seller1Connection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 1000,
          status: RandomGenerator.alphabets(8),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const image =
    await generate_random_shopping_mall_seller_seller_products_images_create(
      seller1Connection,
      {
        params: {
          productId: product.id,
        },
        body: {
          image_uri: typia.random<string & tags.Format<"uri">>(),
          sequence: 1,
          is_thumbnail: true,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image);
  const originalImageId = image.id;
  const originalProductId = image.product.id;
  const originalImageUri = image.image_uri;
  const originalSequence = image.sequence;
  const originalIsThumbnail = image.is_thumbnail;
  await TestValidator.httpError(
    "other seller cannot retrieve another seller product image",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.seller.seller_products.images.at(
        seller2Connection,
        {
          productId: product.id,
          imageId: image.id,
        },
      );
    },
  );
  const ownerRetrieved =
    await api.functional.shoppingMall.seller.seller_products.images.at(
      seller1Connection,
      {
        productId: product.id,
        imageId: image.id,
      },
    );
  typia.assert(ownerRetrieved);
  TestValidator.equals(
    "image id unchanged",
    ownerRetrieved.id,
    originalImageId,
  );
  TestValidator.equals(
    "image product linkage unchanged",
    ownerRetrieved.product.id,
    originalProductId,
  );
  TestValidator.equals(
    "image uri unchanged",
    ownerRetrieved.image_uri,
    originalImageUri,
  );
  TestValidator.equals(
    "image sequence unchanged",
    ownerRetrieved.sequence,
    originalSequence,
  );
  TestValidator.equals(
    "thumbnail flag unchanged",
    ownerRetrieved.is_thumbnail,
    originalIsThumbnail,
  );
  TestValidator.equals(
    "owner product id remains original product",
    ownerRetrieved.product.id,
    product.id,
  );
}
