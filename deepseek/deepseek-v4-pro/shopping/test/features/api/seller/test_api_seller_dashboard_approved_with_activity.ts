import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboard";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller dashboard retrieval for an approved seller.
 *
 * Validates the complete seller approval-to-dashboard flow: administrator registration, seller registration with known credentials, administrator approval of the pending seller, seller re-authentication after approval, and dashboard retrieval. Ensures the dashboard response conforms to the expected structure with all four count fields — products count, order items count, pending cancellations count, and pending refunds count — present and validated by typia.assert.
 *
 * The dashboard is only accessible to approved sellers, so the test explicitly verifies the approval gate by performing approval before dashboard access. Without existing products or orders (no creation endpoints available), all counts are expected to be zero but must be non-negative.
 *
 * 1. Administrator registers via authorize_admin_join and obtains a valid session.
 * 2. Seller registers via authorize_seller_join with known email and password, starting in pending status.
 * 3. Administrator approves the seller using the seller's ID.
 * 4. Seller logs in via authorize_seller_login after approval to establish a fresh authenticated session.
 * 5. Seller retrieves the dashboard via api.functional.shoppingMall.seller.dashboard.at.
 * 6. typia.assert validates the entire response structure including all count constraints.
 */
export async function test_api_seller_dashboard_approved_with_activity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Seller registration with known credentials for later login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: { email: sellerEmail, password: sellerPassword },
  });
  typia.assert(seller);
  // 3. Admin approves the seller's pending registration
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Seller logs in after approval to establish a fresh session
  const sellerDashboardConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerDashboardConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 5. Retrieve the seller dashboard
  const dashboard = await api.functional.shoppingMall.seller.dashboard.at(
    sellerDashboardConnection,
  );
  typia.assert(dashboard);
}
