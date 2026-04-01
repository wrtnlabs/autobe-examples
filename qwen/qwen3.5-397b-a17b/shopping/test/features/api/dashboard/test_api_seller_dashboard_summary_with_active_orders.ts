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
 * Test the seller dashboard summary endpoint for a seller with active business operations.
 *
 * This test validates that:
 * 1. Seller can authenticate and access the dashboard endpoint
 * 2. Dashboard returns all four required count fields
 * 3. All counts are non-negative integers
 * 4. Response structure matches IShoppingMallDashboard.ISummary type
 */
export async function test_api_seller_dashboard_summary_with_active_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Get dashboard summary
  const summary: IShoppingMallDashboard.ISummary =
    await api.functional.shoppingMall.seller.dashboard._summary.at(
      sellerConnection,
    );
  // 3. Validate response structure
  typia.assert(summary);
  // 4. Validate all count fields are non-negative integers
  TestValidator.predicate(
    "products_count is non-negative",
    summary.products_count >= 0,
  );
  TestValidator.predicate(
    "order_items_count is non-negative",
    summary.order_items_count >= 0,
  );
  TestValidator.predicate(
    "pending_cancellations_count is non-negative",
    summary.pending_cancellations_count >= 0,
  );
  TestValidator.predicate(
    "pending_refunds_count is non-negative",
    summary.pending_refunds_count >= 0,
  );
}
