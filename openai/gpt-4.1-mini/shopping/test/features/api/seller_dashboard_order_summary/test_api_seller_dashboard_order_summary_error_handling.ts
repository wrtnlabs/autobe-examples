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

export async function test_api_seller_dashboard_order_summary_error_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up seller authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = { Authorization: authorized.token.access };
  // 2. Call the summary endpoint normally to verify success
  const normalOutput =
    await api.functional.shoppingMall.seller.dashboard.orders.summary(
      sellerConnection,
    );
  typia.assert(normalOutput);
  // 3. Prepare to simulate database failure during aggregation by using simulate flag
  // The simulate flag requests mock data; we simulate error by forcing an exception
  const errorConnection: api.IConnection = {
    host: connection.host,
    headers: sellerConnection.headers,
    simulate: true,
  };
  // 4. Attempt to call summary endpoint with simulate flag that triggers error
  // Because no utility function for error simulation exists, we simulate
  // database failure by setting simulate flag and expecting the API to throw.
  // Test that the correct HttpError is thrown with appropriate status and message.
  await TestValidator.httpError(
    "summary endpoint error handling database failure",
    500,
    async () => {
      await api.functional.shoppingMall.seller.dashboard.orders.summary(
        errorConnection,
      );
    },
  );
}
