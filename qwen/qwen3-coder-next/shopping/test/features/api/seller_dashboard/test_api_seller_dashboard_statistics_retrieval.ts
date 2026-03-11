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

export async function test_api_seller_dashboard_statistics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create new connection and register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Create new connection with seller's token
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: seller.token.access,
    },
  };
  // Retrieve dashboard statistics
  const stats =
    await api.functional.ecommerceMall.seller.dashboard.at(
      sellerAuthConnection,
    );
  typia.assert(stats);
  // Validate all statistics are non-negative integers
  TestValidator.predicate("totalProducts >= 0", stats.totalProducts >= 0);
  TestValidator.predicate(
    "pendingCancellationRequests >= 0",
    stats.pendingCancellationRequests >= 0,
  );
  TestValidator.predicate(
    "pendingRefundRequests >= 0",
    stats.pendingRefundRequests >= 0,
  );
  TestValidator.predicate(
    "totalOrderItemsSold >= 0",
    stats.totalOrderItemsSold >= 0,
  );
}
