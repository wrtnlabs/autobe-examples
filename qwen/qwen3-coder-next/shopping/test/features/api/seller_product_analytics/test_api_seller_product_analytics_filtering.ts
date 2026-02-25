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

export async function test_api_seller_product_analytics_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url:
        Math.random() > 0.5
          ? null
          : typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Test basic filtering by category
  const categoryFiltered =
    await api.functional.shoppingMall.seller.analytics.products.index(
      sellerConnection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(categoryFiltered);
  // Test filtering by price range
  const priceFiltered =
    await api.functional.shoppingMall.seller.analytics.products.index(
      sellerConnection,
      {
        body: {
          min_price: 1000,
          max_price: 10000,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(priceFiltered);
  // Test in stock filter
  const inStockFiltered =
    await api.functional.shoppingMall.seller.analytics.products.index(
      sellerConnection,
      {
        body: {
          in_stock_only: true,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(inStockFiltered);
  // Test combined filters
  const combinedFiltered =
    await api.functional.shoppingMall.seller.analytics.products.index(
      sellerConnection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          min_price: 1000,
          max_price: 5000,
          in_stock_only: true,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(combinedFiltered);
}
