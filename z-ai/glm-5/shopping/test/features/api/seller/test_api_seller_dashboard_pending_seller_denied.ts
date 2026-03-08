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
 * Test that a seller with pending approval status is denied access to the dashboard.
 *
 * This test validates that newly registered sellers (with approval_status='pending')
 * cannot access the seller dashboard endpoint. The dashboard should only be accessible
 * to approved sellers (approval_status='approved', suspended=false, banned=false).
 *
 * Flow:
 * 1. Register a new seller account (defaults to 'pending' approval status)
 * 2. Attempt to access the seller dashboard
 * 3. Expect 403 Forbidden error
 */
export async function test_api_seller_dashboard_pending_seller_denied(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for the pending seller
  const pendingSellerConnection: api.IConnection = { host: connection.host };
  // Register a new seller - account starts with approval_status='pending'
  const seller = await authorize_seller_join(pendingSellerConnection, {
    body: {
      shop_name: RandomGenerator.name(1),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  typia.assert(seller);
  // Verify the seller has 'pending' approval status
  TestValidator.equals(
    "approval status is pending",
    seller.approval_status,
    "pending",
  );
  // Verify the seller is not suspended or banned
  TestValidator.equals("seller is not suspended", seller.suspended, false);
  TestValidator.equals("seller is not banned", seller.banned, false);
  // Attempt to access the dashboard - should receive 403 Forbidden
  await TestValidator.httpError(
    "pending seller denied dashboard access",
    403,
    async () => {
      await api.functional.shoppingMall.seller.dashboard.at(
        pendingSellerConnection,
      );
    },
  );
}
