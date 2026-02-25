import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleViewStat";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sale_view_stats_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Description: Test access control by getting sale view stats without auth and with a seller user
  // 1. Attempt with base connection (no auth) → expect 401 or 403
  await TestValidator.httpError(
    "unauthorized without authentication",
    [401, 403],
    async () =>
      await api.functional.shoppingMall.seller.sales.view_stats.at(connection, {
        saleId: typia.random<string & tags.Format<"uuid">>(),
      }),
  );
  // 2. Seller join and get token
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shopName: "testShop",
      shopDescription: null,
      logoUri: null,
    },
  });
  // Set authorization header for subsequent calls
  sellerConnection.headers ??= {};
  sellerConnection.headers["Authorization"] = `Bearer ${seller.token.access}`;
  // 3. Attempt to get sale view stats with authorized seller connection
  // (since the saleId is random, no existing sale, we expect 404 or 403 if not permitted)
  await TestValidator.httpError(
    "access forbidden or not found with authorized seller",
    [403, 404],
    async () =>
      await api.functional.shoppingMall.seller.sales.view_stats.at(
        sellerConnection,
        {
          saleId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
}
