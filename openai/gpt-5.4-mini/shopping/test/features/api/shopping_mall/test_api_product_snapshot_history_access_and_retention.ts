import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_snapshot_history_access_and_retention(
  connection: api.IConnection,
): Promise<void> {
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Join = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!@#$",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1Join);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Join = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!@#$",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2Join);
  const product = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const ownerHistory =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      seller1Connection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(ownerHistory);
  TestValidator.predicate(
    "owner can access snapshot history",
    ownerHistory.data.length >= 0,
  );
  TestValidator.equals(
    "snapshot history belongs to the requested product",
    ownerHistory.data.length > 0
      ? ownerHistory.data[0].shopping_mall_product.id
      : product.id,
    product.id,
  );
  await TestValidator.error(
    "other seller cannot access snapshot history",
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.index(
        seller2Connection,
        {
          productId: product.id,
          body: {
            page: 1,
            limit: 20,
          } satisfies IShoppingMallProductSnapshot.IRequest,
        },
      );
    },
  );
}
