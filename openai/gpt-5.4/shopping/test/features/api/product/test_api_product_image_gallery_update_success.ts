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

export async function test_api_product_image_gallery_update_success(
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
    },
  });
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
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
  typia.assert(product);
  const updateBody = {
    imageUri: typia.random<string & tags.Format<"uri">>(),
    sequence: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
    isThumbnail: true,
  } satisfies IShoppingMallProductImage.IUpdate;
  const updatedImage =
    await api.functional.shoppingMall.seller.seller_products.images.patchByProductid(
      sellerConnection,
      {
        productId: product.id,
        body: updateBody,
      },
    );
  typia.assert(updatedImage);
  TestValidator.equals(
    "updated image belongs to target product",
    updatedImage.product.id,
    product.id,
  );
  TestValidator.equals(
    "image uri is updated",
    updatedImage.image_uri,
    updateBody.imageUri,
  );
  TestValidator.equals(
    "image sequence is updated",
    updatedImage.sequence,
    updateBody.sequence,
  );
  TestValidator.equals(
    "thumbnail intent is reflected",
    updatedImage.is_thumbnail,
    updateBody.isThumbnail,
  );
  TestValidator.equals("image remains active", updatedImage.deleted_at, null);
  TestValidator.equals(
    "nested product summary id matches",
    updatedImage.product.id,
    product.id,
  );
  TestValidator.equals(
    "nested product summary name matches",
    updatedImage.product.name,
    product.name,
  );
}
