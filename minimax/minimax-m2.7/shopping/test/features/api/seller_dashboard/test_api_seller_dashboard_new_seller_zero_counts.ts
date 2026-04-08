import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboard";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that a newly approved seller with no activity sees zero counts for all dashboard metrics.
 *
 * Validates that the seller dashboard correctly returns zero values for all metrics when a seller
 * has no products listed, no order items, no pending cancellation requests, and no pending refund
 * requests. This ensures the dashboard handles new sellers with no activity gracefully.
 *
 * 1. Register a new seller account with email and password via seller join endpoint.
 * 2. Admin joins and approves the seller to change status from 'pending' to 'approved'.
 * 3. Approved seller logs in to obtain valid session tokens.
 * 4. Seller retrieves dashboard metrics via GET /ecommerceMall/seller/sellers/me/dashboard.
 * 5. Validates all counts equal zero: totalProducts, totalOrderItems, pendingCancellationRequests, pendingRefundRequests.
 */
export async function test_api_seller_dashboard_new_seller_zero_counts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Admin joins and approves the seller
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Approve the pending seller
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  // 3. Approved seller logs in to obtain valid session tokens
  const loggedInSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(loggedInSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 4. Seller retrieves dashboard metrics
  const dashboard =
    await api.functional.ecommerceMall.seller.sellers.me.dashboard.at(
      loggedInSellerConnection,
    );
  typia.assert(dashboard);
  // 5. Validate all counts equal zero
  TestValidator.equals("totalProducts should be 0", dashboard.totalProducts, 0);
  TestValidator.equals(
    "totalOrderItems should be 0",
    dashboard.totalOrderItems,
    0,
  );
  TestValidator.equals(
    "pendingCancellationRequests should be 0",
    dashboard.pendingCancellationRequests,
    0,
  );
  TestValidator.equals(
    "pendingRefundRequests should be 0",
    dashboard.pendingRefundRequests,
    0,
  );
}
