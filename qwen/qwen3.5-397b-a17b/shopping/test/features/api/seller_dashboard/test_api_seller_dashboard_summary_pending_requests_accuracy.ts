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
 * Test seller dashboard summary endpoint for pending request count accuracy.
 *
 * This test validates the dashboard summary endpoint returns correct structure
 * and data types for pending cancellation and refund request counts.
 *
 * Test Flow:
 * 1. Register a new seller account using authorize_seller_join utility
 * 2. Call the dashboard summary endpoint with seller authentication
 * 3. Validate response structure with typia.assert()
 * 4. Verify counts are zero for new seller account
 *
 * Note: Full business logic validation (testing pending vs responded requests)
 * requires API endpoints for creating products, orders, cancellation requests,
 * and refund requests which are not available in the current SDK function list.
 * This test validates the endpoint structure and response types for a new seller
 * account (expected zero counts for all metrics).
 */
export async function test_api_seller_dashboard_summary_pending_requests_accuracy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Call dashboard summary endpoint
  const summary =
    await api.functional.shoppingMall.seller.dashboard._summary.at(
      sellerConnection,
    );
  typia.assert(summary);
  // 3. Validate counts are zero for new seller (business logic validation)
  // typia.assert() already validates types, so only test business expectations
  TestValidator.equals("new seller products count", summary.products_count, 0);
  TestValidator.equals(
    "new seller order items count",
    summary.order_items_count,
    0,
  );
  TestValidator.equals(
    "new seller pending cancellations",
    summary.pending_cancellations_count,
    0,
  );
  TestValidator.equals(
    "new seller pending refunds",
    summary.pending_refunds_count,
    0,
  );
}
