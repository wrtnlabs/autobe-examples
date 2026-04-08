import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDashboard";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller dashboard cancellation-refund endpoint empty state.
 *
 * Validates the seller dashboard cancellation-refund statistics endpoint when the seller has no pending cancellation or refund requests. This test establishes the baseline state where a newly registered seller should see zero pending requests in their dashboard.
 *
 * The test authenticates a seller account via the join operation, then queries the dashboard endpoint to verify the response structure and count values. Both cancellationPendingCount and refundPendingCount should be 0 when no requests exist.
 *
 * 1. Seller registers and authenticates via authorize_seller_join utility.
 * 2. Seller calls dashboard cancellation-refund endpoint.
 * 3. Validates response structure via typia.assert().
 * 4. Validates cancellationPendingCount equals 0.
 * 5. Validates refundPendingCount equals 0.
 */
export async function test_api_seller_dashboard_cancellation_refund_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Call dashboard cancellation-refund endpoint
  const dashboard =
    await api.functional.shoppingMall.seller.dashboard.cancellation_refund.at(
      sellerConnection,
    );
  typia.assert(dashboard);
  // 3. Validate counts are 0 (empty state)
  TestValidator.equals(
    "cancellation pending count",
    dashboard.cancellationPendingCount,
    0,
  );
  TestValidator.equals("refund pending count", dashboard.refundPendingCount, 0);
}
