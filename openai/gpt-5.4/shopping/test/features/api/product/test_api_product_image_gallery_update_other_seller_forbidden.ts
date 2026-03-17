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

export async function test_api_product_image_gallery_update_other_seller_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const sellerOneConnection: api.IConnection = {
    host: connection.host,
  };
  const sellerOne = await authorize_seller_join(sellerOneConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerOne);
  const ownedProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerOneConnection,
      {},
    );
  typia.assert(ownedProduct);
  const sellerTwoConnection: api.IConnection = {
    host: connection.host,
  };
  const sellerTwo = await authorize_seller_join(sellerTwoConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerTwo);
  const unauthorizedPatchBody = {
    imageUri: typia.random<string & tags.Format<"uri">>(),
    sequence: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
    isThumbnail: true,
  } satisfies IShoppingMallProductImage.IUpdate;
  await TestValidator.httpError(
    "other seller cannot update product image gallery",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.seller.seller_products.images.patchByProductid(
        sellerTwoConnection,
        {
          productId: ownedProduct.id,
          body: unauthorizedPatchBody,
        },
      );
    },
  );
  TestValidator.equals(
    "product owner remains seller one",
    ownedProduct.seller.id,
    sellerOne.id,
  );
  TestValidator.notEquals(
    "attacker is a different seller",
    sellerTwo.id,
    sellerOne.id,
  );
}
