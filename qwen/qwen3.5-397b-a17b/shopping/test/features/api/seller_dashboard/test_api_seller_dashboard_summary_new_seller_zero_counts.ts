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
 * Test seller dashboard summary for newly registered seller with zero counts.
 *
 * This test verifies that a seller who has just registered but has not yet
 * created any products, received any orders, or had any cancellation/refund
 * requests will see all dashboard statistics as zero. This edge case validates
 * that the dashboard correctly handles sellers at the beginning of their
 * journey with empty data sets and ensures the aggregation queries return
 * zero instead of null or errors.
 *
 * Test flow:
 * 1. Register a new seller account using authorize_seller_join utility
 * 2. Create seller-specific connection with authentication token
 * 3. Call dashboard summary endpoint
 * 4. Verify all four count fields are zero
 */
export async function test_api_seller_dashboard_summary_new_seller_zero_counts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller and get authentication
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create seller-specific connection with authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 3. Call dashboard summary endpoint
  const summary =
    await api.functional.shoppingMall.seller.dashboard._summary.at(
      sellerConnection,
    );
  typia.assert(summary);
  // 4. Verify all counts are zero for new seller
  TestValidator.equals("products_count", summary.products_count, 0);
  TestValidator.equals("order_items_count", summary.order_items_count, 0);
  TestValidator.equals(
    "pending_cancellations_count",
    summary.pending_cancellations_count,
    0,
  );
  TestValidator.equals(
    "pending_refunds_count",
    summary.pending_refunds_count,
    0,
  );
}
