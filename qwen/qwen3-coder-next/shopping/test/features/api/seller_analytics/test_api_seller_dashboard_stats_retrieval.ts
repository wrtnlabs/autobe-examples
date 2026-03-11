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

export async function test_api_seller_dashboard_stats_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(10) + "@test.com",
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Get dashboard stats - no body required for this endpoint
  const stats =
    await api.functional.ecommerceMall.seller.analytics.dashboard.stats(
      sellerConnection,
      {
        body: {
          // Empty request body as per API design
        },
      },
    );
  typia.assert(stats);
  // Validate response structure
  TestValidator.predicate(
    "totalProducts is non-negative",
    stats.totalProducts >= 0,
  );
  TestValidator.predicate(
    "pendingCancellationRequests is non-negative",
    stats.pendingCancellationRequests >= 0,
  );
  TestValidator.predicate(
    "pendingRefundRequests is non-negative",
    stats.pendingRefundRequests >= 0,
  );
  TestValidator.predicate(
    "totalOrderItemsSold is non-negative",
    stats.totalOrderItemsSold >= 0,
  );
}
