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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_image_thumbnail_normalization(
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
          status: RandomGenerator.pick(["draft", "active", "selling"] as const),
        },
      },
    );
  typia.assert(product);
  const updated = await api.functional.shoppingMall.products.images.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        imageUri: typia.random<string & tags.Format<"uri">>(),
        sequence: 2,
        isThumbnail: false,
      } satisfies IShoppingMallProductImage.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals("product id is preserved", updated.id, product.id);
  TestValidator.equals(
    "seller ownership is preserved",
    updated.seller.id,
    product.seller.id,
  );
  const images = updated.images;
  TestValidator.predicate(
    "all images belong to returned product",
    images.every((image) => image.product.id === updated.id),
  );
  TestValidator.predicate(
    "images are ordered by ascending sequence",
    images.every(
      (image, index) =>
        index === 0 || images[index - 1].sequence <= image.sequence,
    ),
  );
  if (images.length > 0) {
    const thumbnailCount = images.filter((image) => image.is_thumbnail).length;
    TestValidator.equals(
      "exactly one thumbnail remains active",
      thumbnailCount,
      1,
    );
    TestValidator.equals(
      "first image is the effective thumbnail",
      images[0].is_thumbnail,
      true,
    );
    TestValidator.predicate(
      "only the first image can be thumbnail",
      images.every((image, index) =>
        index === 0 ? image.is_thumbnail : image.is_thumbnail === false,
      ),
    );
  } else {
    TestValidator.equals("normalized gallery can be empty", images.length, 0);
  }
}
