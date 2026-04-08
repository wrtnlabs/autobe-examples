import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboard";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller dashboard with empty shop showing zero metrics.
 *
 * Validates that a newly registered seller with no business activity sees correct zero values across all dashboard metrics. This test ensures the dashboard correctly initializes for sellers who have not yet created products or received orders.
 *
 * The test verifies that all four key metrics (totalProducts, totalOrderItems, pendingCancellationRequests, pendingRefundRequests) return 0 for a fresh seller account, confirming proper data aggregation and empty state handling.
 *
 * 1. Register a new seller account with valid credentials using the utility function
 * 2. Access the seller dashboard endpoint with the authenticated connection
 * 3. Validate that all dashboard metrics show zero values for an empty shop
 */
export async function test_api_seller_dashboard_empty_shop(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Access the seller dashboard
  const dashboard =
    await api.functional.shoppingMall.seller.sellers.me.dashboard(
      sellerConnection,
    );
  typia.assert(dashboard);
  // 3. Validate all metrics are zero for empty shop
  TestValidator.equals("totalProducts is 0", dashboard.totalProducts, 0);
  TestValidator.equals("totalOrderItems is 0", dashboard.totalOrderItems, 0);
  TestValidator.equals(
    "pendingCancellationRequests is 0",
    dashboard.pendingCancellationRequests,
    0,
  );
  TestValidator.equals(
    "pendingRefundRequests is 0",
    dashboard.pendingRefundRequests,
    0,
  );
}
