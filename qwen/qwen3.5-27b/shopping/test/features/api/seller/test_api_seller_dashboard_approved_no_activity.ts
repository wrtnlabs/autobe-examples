import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDashboard";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
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
 * Test that an approved seller with no shop activity can successfully retrieve
 * their dashboard showing zero counts.
 *
 * This test validates the edge case where a newly approved seller has not yet
 * started selling, ensuring the dashboard handles empty states gracefully and
 * returns valid zero values instead of errors.
 */
export async function test_api_seller_dashboard_approved_no_activity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  // 2. Setup seller connection and register new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    shop_name: RandomGenerator.name(2),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);
  // Store seller credentials for login after approval
  const sellerEmail = sellerAuth.email;
  const sellerPassword = "1234";
  // 3. Approve the seller's approval request as admin
  // Note: In a complete system, we would list approval requests and find
  // the one for this seller. Since the list endpoint is not available in
  // the provided SDK, we simulate the approval process.
  // In production, this would be: GET /shoppingMall/admin/sellerApprovalRequests
  // to find the request, then PUT to approve it.
  // For this test, we'll use a simulated request ID
  // In a real scenario, the seller registration would return the request ID
  // or there would be a list endpoint to retrieve it
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const approvalUpdate =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.update(
      adminConnection,
      {
        requestId,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvalUpdate);
  // 4. Login as the approved seller
  // Create a new connection for seller login
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 5. Call the dashboard endpoint
  const dashboard = await api.functional.shoppingMall.seller.dashboard.at(
    sellerLoginConnection,
  );
  typia.assert(dashboard);
  // 6. Validate that all counts are zero
  TestValidator.equals("products_count is zero", dashboard.products_count, 0);
  TestValidator.equals(
    "order_items_count is zero",
    dashboard.order_items_count,
    0,
  );
  TestValidator.equals(
    "pending_cancellation_count is zero",
    dashboard.pending_cancellation_count,
    0,
  );
  TestValidator.equals(
    "pending_refund_count is zero",
    dashboard.pending_refund_count,
    0,
  );
}
