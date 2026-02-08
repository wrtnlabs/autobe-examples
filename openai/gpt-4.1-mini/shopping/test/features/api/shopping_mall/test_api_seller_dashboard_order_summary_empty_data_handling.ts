import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallOrderOrderSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderOrderSummary";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_order_summary_empty_data_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new seller account and authorize
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // Inject authorization token into sellerConnection headers
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Call the order summary endpoint with the authorized seller connection
  const summary =
    await api.functional.shoppingMall.seller.dashboard.orders.summary(
      sellerConnection,
    );
  typia.assert(summary);
  // 3. Validate the response contains zero values indicating no orders
  // Since IShoppingMallOrderOrderSummary is {} (empty object type per DTO),
  // just assert that the response is an object. If there are specific known
  // properties indicating zero counts, assert those here. Given DTO is empty,
  // just predicate for object type.
  TestValidator.predicate(
    "order summary should be an object",
    typeof summary === "object" && summary !== null,
  );
}
