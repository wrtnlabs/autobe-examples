import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboard";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const registeredSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(registeredSeller);
  // 2. Login as the new seller to get authenticated connection
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_seller_login(authenticatedSellerConnection, {
    body: {
      email: registeredSeller.email,
      password: "1234",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Call dashboard endpoint with empty state request
  const summary =
    await api.functional.ecommerceMall.seller.analytics.dashboard.at(
      authenticatedSellerConnection,
      {
        body: {} satisfies IEcommerceMallDashboard.IRequest,
      },
    );
  typia.assert(summary);
  // 4. Verify empty state counts are all 0
  TestValidator.equals("totalProducts is 0", summary.totalProducts, 0);
  TestValidator.equals(
    "pendingCancellationRequests is 0",
    summary.pendingCancellationRequests,
    0,
  );
  TestValidator.equals(
    "pendingRefundRequests is 0",
    summary.pendingRefundRequests,
    0,
  );
  TestValidator.equals(
    "totalOrderItemsSold is 0",
    summary.totalOrderItemsSold,
    0,
  );
}
