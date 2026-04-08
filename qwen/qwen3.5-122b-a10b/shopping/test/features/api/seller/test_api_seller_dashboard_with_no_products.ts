import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IEcommerceShopDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShopDashboard";
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
 * Test seller dashboard endpoint with zero products and orders.
 *
 * Validates that a newly registered seller can access their shop dashboard and receives zero counts for all statistics when they have not yet created any products or received any orders. This edge case ensures the dashboard handles empty data gracefully without errors.
 *
 * The test verifies the following dashboard statistics are all zero:
 * - product_count: Total products owned by the seller
 * - order_item_count: Total order items for seller's products
 * - pending_cancellation_request_count: Pending cancellation requests
 * - pending_refund_request_count: Pending refund requests
 *
 * 1. Register a new seller account with random credentials.
 * 2. Create seller-specific connection with authorization token.
 * 3. Call the dashboard endpoint to retrieve statistics.
 * 4. Validate response type and all count fields equal zero.
 */
export async function test_api_seller_dashboard_with_no_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IEcommerceSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  // 2. Access seller dashboard
  const dashboard: IEcommerceShopDashboard.ISummary =
    await api.functional.ecommerce.seller.dashboard.at(sellerConnection);
  typia.assert(dashboard);
  // 3. Validate all counts are zero
  TestValidator.equals("product count", dashboard.product_count, 0);
  TestValidator.equals("order item count", dashboard.order_item_count, 0);
  TestValidator.equals(
    "pending cancellation request count",
    dashboard.pending_cancellation_request_count,
    0,
  );
  TestValidator.equals(
    "pending refund request count",
    dashboard.pending_refund_request_count,
    0,
  );
}
