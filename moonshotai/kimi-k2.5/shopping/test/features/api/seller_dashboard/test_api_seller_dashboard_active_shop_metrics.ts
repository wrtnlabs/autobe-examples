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
 * @tag Authentication
 * @tag Seller
 * @tag Dashboard
 *
 * Test that an approved seller can access their dashboard and receive
 * comprehensive business performance metrics properly scoped to their account.
 *
 * The dashboard provides aggregated data including:
 * - Total number of active products in the seller's catalog
 * - Total number of order items purchased from the seller's products
 * - Count of pending cancellation requests requiring seller response
 * - Count of pending refund requests requiring seller response
 *
 * This test validates the authentication flow and response structure.
 */
export async function test_api_seller_dashboard_active_shop_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a seller-specific connection for authentication isolation
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 2: Register a new seller account using the utility function
  // This creates an authenticated seller session and updates connection headers
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Step 3: Access the seller dashboard to retrieve business metrics
  // The dashboard endpoint scopes all data to the authenticated seller
  const dashboard: IEcommerceMallSellerDashboard =
    await api.functional.ecommerceMall.seller.dashboard.at(sellerConnection);
  typia.assert(dashboard);
  // Step 4: Validate dashboard metrics structure and non-negative values
  // All counts should be zero or positive integers for a newly created seller
  typia.assertGuard<IEcommerceMallSellerDashboard>(dashboard);
}
