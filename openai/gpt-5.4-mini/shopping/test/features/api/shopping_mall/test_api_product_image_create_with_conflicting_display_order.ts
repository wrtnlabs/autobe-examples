import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_image_create_with_conflicting_display_order(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const authedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerAuth.token.access,
    },
  };
  const productId = typia.random<string & tags.Format<"uuid">>();
  const firstImage =
    await api.functional.shoppingMall.seller.products.images.create(
      authedSellerConnection,
      {
        productId,
        body: {
          imageUri: typia.random<string & tags.Format<"url">>(),
          displayOrder: 0,
          altText: RandomGenerator.name(),
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(firstImage);
  await TestValidator.error(
    "conflicting display order should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.images.create(
        authedSellerConnection,
        {
          productId,
          body: {
            imageUri: typia.random<string & tags.Format<"url">>(),
            displayOrder:
              firstImage.displayOrder satisfies number as number,
            altText: RandomGenerator.name(),
          } satisfies IShoppingMallProductImage.ICreate,
        },
      );
    },
  );
  const secondImage =
    await api.functional.shoppingMall.seller.products.images.create(
      authedSellerConnection,
      {
        productId,
        body: {
          imageUri: typia.random<string & tags.Format<"url">>(),
          displayOrder: (firstImage.displayOrder + 1) satisfies number as number,
          altText: RandomGenerator.name(),
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(secondImage);
  TestValidator.notEquals(
    "non-conflicting image should use a different display order",
    firstImage.displayOrder,
    secondImage.displayOrder,
  );
}
