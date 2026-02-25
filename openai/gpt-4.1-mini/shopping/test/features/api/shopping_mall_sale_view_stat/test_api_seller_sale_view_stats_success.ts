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

export async function test_api_seller_sale_view_stats_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins to get authorized session
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(authorizedSeller);
  // 2. sellerConnection has authorization header set by authorize_seller_join
  // 3. Use a random saleId for testing; in real tests, this should be an existing saleId
  const saleId = typia.random<string & tags.Format<"uuid">>();
  // 4. Call view stats API
  const result = await api.functional.shoppingMall.seller.sales.view_stats.at(
    sellerConnection,
    {
      saleId,
    },
  );
  typia.assert(result);
  // 5. Validate required fields
  TestValidator.predicate("viewCount >= 0", result.viewCount >= 0);
  TestValidator.predicate("uniqueViewCount >= 0", result.uniqueViewCount >= 0);
  // deletedAt can be string or null
  TestValidator.predicate(
    "deletedAt is string or null",
    typeof result.deletedAt === "string" || result.deletedAt === null,
  );
  // 6. Validate saleId matches
  TestValidator.equals("saleId matches", result.shoppingMallSaleId, saleId);
  // 7. Validate timestamps order
  TestValidator.predicate(
    "firstViewedAt <= lastViewedAt",
    new Date(result.firstViewedAt) <= new Date(result.lastViewedAt),
  );
  TestValidator.predicate(
    "createdAt <= updatedAt",
    new Date(result.createdAt) <= new Date(result.updatedAt),
  );
}
