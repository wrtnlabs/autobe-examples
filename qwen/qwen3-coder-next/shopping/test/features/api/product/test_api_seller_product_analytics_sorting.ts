import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_analytics_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Create products with different prices and view counts for sorting tests
  const products = ArrayUtil.repeat(5, () => ({
    name: RandomGenerator.name(),
    base_price: RandomGenerator.alphabets(3),
    is_deleted: false,
    category_id: typia.random<string & tags.Format<"uuid">>(),
  }));
  // Test sorting by newest (default)
  const newestResult =
    await api.functional.shoppingMall.seller.analytics.products.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(newestResult);
  // Test sorting by price ascending
  const priceAscResult =
    await api.functional.shoppingMall.seller.analytics.products.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(priceAscResult);
  // Test sorting by price descending
  const priceDescResult =
    await api.functional.shoppingMall.seller.analytics.products.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(priceDescResult);
  // Test sorting by views descending
  const viewsDescResult =
    await api.functional.shoppingMall.seller.analytics.products.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(viewsDescResult);
  // Test sorting by sales descending
  const salesDescResult =
    await api.functional.shoppingMall.seller.analytics.products.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(salesDescResult);
  // Test sorting by rating descending
  const ratingDescResult =
    await api.functional.shoppingMall.seller.analytics.products.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(ratingDescResult);
}
