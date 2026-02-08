import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_sale_at_authentication_required_for_access(
  connection: api.IConnection,
): Promise<void> {
  // Validate access to /shoppingMall/seller/sales/{saleId} requires seller authentication
  // 1. Create a seller join connection and authorize seller join (setup prerequisite)
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerJoinConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Attempt to access the sales detail endpoint without authentication
  // Use the base connection without Authorization header
  const randomSaleId = typia.random<string & tags.Format<"uuid">>();
  // Expect an HTTP 401 Unauthorized error
  await TestValidator.httpError(
    "access sale detail without authentication",
    401,
    async () => {
      await api.functional.shoppingMall.seller.sales.at(connection, {
        saleId: randomSaleId,
      });
    },
  );
}
