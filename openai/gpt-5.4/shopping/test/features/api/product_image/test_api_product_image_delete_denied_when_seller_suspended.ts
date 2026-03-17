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

export async function test_api_product_image_delete_denied_when_seller_suspended(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_seller_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      ownerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          status: "active",
        },
      },
    );
  typia.assert(product);
  const firstImage =
    await generate_random_shopping_mall_seller_seller_products_images_create(
      ownerConnection,
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
  typia.assert(firstImage);
  const secondImage =
    await generate_random_shopping_mall_seller_seller_products_images_create(
      ownerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          image_uri: typia.random<string & tags.Format<"uri">>(),
          sequence: 2,
          is_thumbnail: false,
        },
      },
    );
  typia.assert(secondImage);
  const initialFirstImageId = firstImage.id;
  const initialFirstImageSequence = firstImage.sequence;
  const initialFirstImageThumbnail = firstImage.is_thumbnail;
  const initialSecondImageId = secondImage.id;
  const initialSecondImageSequence = secondImage.sequence;
  const initialSecondImageThumbnail = secondImage.is_thumbnail;
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruder = await authorize_seller_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(intruder);
  await TestValidator.httpError(
    "non-owner seller cannot delete another seller's product image",
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
  TestValidator.equals(
    "target image id remains the same after rejected deletion",
    firstImage.id,
    initialFirstImageId,
  );
  TestValidator.equals(
    "target image sequence remains unchanged after rejected deletion",
    firstImage.sequence,
    initialFirstImageSequence,
  );
  TestValidator.equals(
    "target image thumbnail flag remains unchanged after rejected deletion",
    firstImage.is_thumbnail,
    initialFirstImageThumbnail,
  );
  TestValidator.equals(
    "other image id remains the same after rejected deletion",
    secondImage.id,
    initialSecondImageId,
  );
  TestValidator.equals(
    "other image sequence remains unchanged after rejected deletion",
    secondImage.sequence,
    initialSecondImageSequence,
  );
  TestValidator.equals(
    "other image thumbnail flag remains unchanged after rejected deletion",
    secondImage.is_thumbnail,
    initialSecondImageThumbnail,
  );
  TestValidator.predicate(
    "thumbnail and ordering setup remains logically intact in captured gallery state",
    firstImage.is_thumbnail === true &&
      firstImage.sequence < secondImage.sequence,
  );
}
