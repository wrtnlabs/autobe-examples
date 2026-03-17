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

export async function test_api_product_image_delete_denied_for_other_seller(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnectionA: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerConnectionA, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerA);
  const ownedProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnectionA,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >() satisfies number as number,
          status: "active",
        },
      },
    );
  typia.assert(ownedProduct);
  const createdImage =
    await generate_random_shopping_mall_seller_seller_products_images_create(
      sellerConnectionA,
      {
        params: {
          productId: ownedProduct.id,
        },
        body: {
          image_uri: typia.random<string & tags.Format<"uri">>(),
          sequence: 1,
          is_thumbnail: true,
        },
      },
    );
  typia.assert(createdImage);
  const originalImageId = createdImage.id;
  const originalProductId = ownedProduct.id;
  const originalImageUri = createdImage.image_uri;
  const originalSequence = createdImage.sequence;
  const originalThumbnail = createdImage.is_thumbnail;
  const sellerConnectionB: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerConnectionB, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerB);
  await TestValidator.httpError(
    "other seller cannot delete another seller's product image",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.seller.seller_products.images.erase(
        sellerConnectionB,
        {
          productId: originalProductId,
          imageId: originalImageId,
        },
      );
    },
  );
  TestValidator.equals(
    "forbidden request targeted original product",
    originalProductId,
    ownedProduct.id,
  );
  TestValidator.equals(
    "image id remains the original captured id",
    createdImage.id,
    originalImageId,
  );
  TestValidator.equals(
    "image product remains the original product",
    createdImage.product.id,
    originalProductId,
  );
  TestValidator.equals(
    "image uri remains unchanged in captured state",
    createdImage.image_uri,
    originalImageUri,
  );
  TestValidator.equals(
    "image sequence remains unchanged in captured state",
    createdImage.sequence,
    originalSequence,
  );
  TestValidator.equals(
    "image thumbnail flag remains unchanged in captured state",
    createdImage.is_thumbnail,
    originalThumbnail,
  );
}
