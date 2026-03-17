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

export async function test_api_product_image_update_while_seller_suspended(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  TestValidator.equals(
    "seller is not suspended in available fixture",
    seller.suspended,
    false,
  );
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 1000,
          status: RandomGenerator.pick(["draft", "active"] as const),
        },
      },
    );
  typia.assert(product);
  const firstImage =
    await generate_random_shopping_mall_seller_seller_products_images_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          image_uri: typia.random<string & tags.Format<"uri">>(),
          sequence: 0,
          is_thumbnail: true,
        },
      },
    );
  typia.assert(firstImage);
  const secondImage =
    await generate_random_shopping_mall_seller_seller_products_images_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          image_uri: typia.random<string & tags.Format<"uri">>(),
          sequence: 1,
          is_thumbnail: false,
        },
      },
    );
  typia.assert(secondImage);
  const updateBody = {
    imageUri: typia.random<string & tags.Format<"uri">>(),
    sequence: 0,
    isThumbnail: true,
  } satisfies IShoppingMallProductImage.IUpdate;
  const updated =
    await api.functional.shoppingMall.seller.seller_products.images.putByProductidAndImageid(
      sellerConnection,
      {
        productId: product.id,
        imageId: secondImage.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated image id is preserved",
    updated.id,
    secondImage.id,
  );
  TestValidator.equals(
    "updated image belongs to product",
    updated.product.id,
    product.id,
  );
  TestValidator.equals(
    "updated image uri matches request",
    updated.image_uri,
    updateBody.imageUri,
  );
  TestValidator.equals(
    "updated image sequence matches request",
    updated.sequence,
    updateBody.sequence,
  );
  TestValidator.predicate(
    "updated image becomes thumbnail after moving to first position",
    updated.is_thumbnail === true,
  );
}
