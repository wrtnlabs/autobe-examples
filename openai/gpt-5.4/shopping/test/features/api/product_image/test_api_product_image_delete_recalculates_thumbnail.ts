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

export async function test_api_product_image_delete_recalculates_thumbnail(
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
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 100,
          status: RandomGenerator.alphabets(8),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const firstImage =
    await generate_random_shopping_mall_seller_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_uri: typia.random<string & tags.Format<"uri">>(),
          sequence: 1,
          is_thumbnail: true,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(firstImage);
  const secondImage =
    await generate_random_shopping_mall_seller_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_uri: typia.random<string & tags.Format<"uri">>(),
          sequence: 2,
          is_thumbnail: false,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(secondImage);
  const thirdImage =
    await generate_random_shopping_mall_seller_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_uri: typia.random<string & tags.Format<"uri">>(),
          sequence: 3,
          is_thumbnail: false,
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(thirdImage);
  TestValidator.equals(
    "first image belongs to product",
    firstImage.product.id,
    product.id,
  );
  TestValidator.equals(
    "second image belongs to product",
    secondImage.product.id,
    product.id,
  );
  TestValidator.equals(
    "third image belongs to product",
    thirdImage.product.id,
    product.id,
  );
  TestValidator.equals(
    "first image starts at sequence 1",
    firstImage.sequence,
    1,
  );
  TestValidator.equals(
    "second image starts at sequence 2",
    secondImage.sequence,
    2,
  );
  TestValidator.equals(
    "third image starts at sequence 3",
    thirdImage.sequence,
    3,
  );
  TestValidator.equals(
    "first image is initial thumbnail",
    firstImage.is_thumbnail,
    true,
  );
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruder = await authorize_seller_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(intruder);
  await TestValidator.httpError(
    "non-owner cannot delete another seller product image",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.seller.seller_products.images.erase(
        intruderConnection,
        {
          productId: product.id,
          imageId: firstImage.id,
        },
      );
    },
  );
  await api.functional.shoppingMall.seller.seller_products.images.erase(
    sellerConnection,
    {
      productId: product.id,
      imageId: firstImage.id,
    },
  );
  await TestValidator.httpError(
    "deleted image cannot be deleted again",
    [400, 404, 409],
    async () => {
      await api.functional.shoppingMall.seller.seller_products.images.erase(
        sellerConnection,
        {
          productId: product.id,
          imageId: firstImage.id,
        },
      );
    },
  );
}
