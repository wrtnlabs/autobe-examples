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
 * Test seller dashboard access with aggregated shop statistics.
 *
 * Validates that an authenticated seller can successfully access their shop dashboard endpoint and receives properly structured aggregated statistics. The dashboard response must include all four count metrics: product_count, order_item_count, pending_cancellation_request_count, and pending_refund_request_count. Each count should be a non-negative integer reflecting the current state of the seller's shop.
 *
 * This test focuses on the primary success path for dashboard access, ensuring the endpoint returns valid data structure and all required fields are present with appropriate types. Since product and order creation APIs are not available in the current SDK, the test validates response structure rather than specific count values.
 *
 * 1. Create a seller connection for authentication.
 * 2. Register a new seller account with randomized credentials.
 * 3. Access the seller dashboard endpoint using authenticated connection.
 * 4. Validate response structure contains all required count fields.
 * 5. Verify all count values are non-negative integers.
 */
export async function test_api_seller_dashboard_with_products_and_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Register seller account
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Access seller dashboard
  const dashboard =
    await api.functional.ecommerce.seller.dashboard.at(sellerConnection);
  typia.assert(dashboard);
  // 4. Validate response structure and count fields
  TestValidator.predicate(
    "product_count is non-negative integer",
    dashboard.product_count >= 0,
  );
  TestValidator.predicate(
    "order_item_count is non-negative integer",
    dashboard.order_item_count >= 0,
  );
  TestValidator.predicate(
    "pending_cancellation_request_count is non-negative integer",
    dashboard.pending_cancellation_request_count >= 0,
  );
  TestValidator.predicate(
    "pending_refund_request_count is non-negative integer",
    dashboard.pending_refund_request_count >= 0,
  );
}
