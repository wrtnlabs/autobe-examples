import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerDashboard";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that the seller dashboard returns all zero metrics for a newly registered seller with no activity.
 *
 * Validates that when a freshly registered seller (with no products, no orders, and no pending requests) accesses their dashboard, all four aggregate metrics return zero rather than null. The seller is authenticated via their JWT token obtained during registration.
 *
 * 1. Register a new seller account via seller join (obtains JWT tokens and sets authorization headers on the seller's connection).
 * 2. Register a new administrator account via administrator join (required administrator exists in the system).
 * 3. Call the seller dashboard endpoint as the authenticated seller.
 * 4. Verify the response body matches the expected schema.
 * 5. Verify totalProducts is 0 — no products created.
 * 6. Verify totalOrderItems is 0 — no orders placed.
 * 7. Verify pendingCancellationRequests is 0 — no cancellation requests exist.
 * 8. Verify pendingRefundRequests is 0 — no refund requests exist.
 */
export async function test_api_seller_dashboard_new_approved_seller_zero_metrics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller and obtain JWT authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Register an administrator who can manage the platform
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: typia.random<IECommerceMallAdministrator.IJoin>(),
  });
  // 3. Call the seller dashboard as the authenticated seller
  const dashboard: IECommerceMallSellerDashboard =
    await api.functional.eCommerceMall.seller.dashboard.at(sellerConnection);
  typia.assert(dashboard);
  // 4. Validate all four metrics are zero
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
