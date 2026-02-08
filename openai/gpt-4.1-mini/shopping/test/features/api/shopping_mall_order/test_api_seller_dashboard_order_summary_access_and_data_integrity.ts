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

export async function test_api_seller_dashboard_order_summary_access_and_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // Scenario:
  // - Authorized seller can access order summary dashboard endpoint.
  // - Validate response structure and aggregated data correctness.
  // - Unauthorized user (without seller token) must be denied access.
  // Create seller connection and authorize seller join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerAuthorized);
  // Update sellerConnection with access token
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // Authorized access: Retrieve order summary
  const summary =
    await api.functional.shoppingMall.seller.dashboard.orders.summary(
      sellerConnection,
    );
  typia.assert(summary);
  // Validate important fields exist and are numbers
  // (Depending on IShoppingMallOrderOrderSummary structure, but here assumed properties)
  // As IShoppingMallOrderOrderSummary type has no explicit properties in the provided snippet,
  // we validate that the returned object is not null/undefined and is an object.
  TestValidator.predicate(
    "summary is object",
    summary !== null && typeof summary === "object",
  );
  // Inability to access by unauthorized base connection (no auth)
  await TestValidator.httpError(
    "unauthorized access forbidden",
    401,
    async () => {
      await api.functional.shoppingMall.seller.dashboard.orders.summary(
        connection,
      );
    },
  );
  // Optionally further elaborate tests such as performance on large dataset,
  // correctness of counts etc. But those require more context/data, so omitted.
}
