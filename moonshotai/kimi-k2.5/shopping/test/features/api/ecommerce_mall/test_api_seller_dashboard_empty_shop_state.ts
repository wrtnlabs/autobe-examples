import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboard";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * A newly approved seller who has not yet created any products or received any orders
 * accesses their dashboard. The test validates that the endpoint correctly handles the
 * empty state edge case by returning 0 for all four metrics.
 */
export async function test_api_seller_dashboard_empty_shop_state(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // 1. Register a new seller (join automatically authenticates the connection)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IEcommerceMallSeller.IJoin;
  const seller = await authorize_seller_join(sellerConnection, {
    body: joinInput,
  });
  typia.assert(seller);
  // 2. Access the seller dashboard (seller connection is already authenticated)
  const dashboard: IEcommerceMallSellerDashboard =
    await api.functional.ecommerceMall.seller.dashboard.at(sellerConnection);
  typia.assert(dashboard);
  // 3. Validate all metrics are 0 for an empty shop state
  TestValidator.equals(
    "totalProducts is 0 for new seller",
    dashboard.totalProducts,
    0,
  );
  TestValidator.equals(
    "totalOrderItems is 0 for new seller",
    dashboard.totalOrderItems,
    0,
  );
  TestValidator.equals(
    "pendingCancellationRequests is 0 for new seller",
    dashboard.pendingCancellationRequests,
    0,
  );
  TestValidator.equals(
    "pendingRefundRequests is 0 for new seller",
    dashboard.pendingRefundRequests,
    0,
  );
}
