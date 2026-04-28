import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerDashboard";
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
 * Test initial seller dashboard state with pending approval and zero metrics.
 *
 * Validates the complete dashboard response immediately after new seller account registration, confirming that the dashboard correctly reflects an unapproved seller's initial state with all business metrics at zero.
 *
 * Special attention is given to verifying that rejectionReason is null for pending sellers (not yet reviewed), and that the shop profile information is properly initialized upon account creation.
 *
 * 1. New seller account is registered, creating seller with 'pending' approval status.
 * 2. Authorization response validated for pending status.
 * 3. Seller dashboard is retrieved via authenticated request.
 * 4. Dashboard fields are verified: approvalStatus is 'pending', rejectionReason is null, shop profile is populated, and all aggregate metrics (totalProducts, totalOrderItems, totalPendingCancellationRequests, totalPendingRefundRequests) are zero.
 */
export async function test_api_seller_dashboard_pending_initial_status(
  connection: api.IConnection,
) {
  // 1. Create isolated seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Register new seller account (automatically sets Authorization header)
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedSeller);
  // 3. Validate authorization response shows pending status
  TestValidator.equals(
    "seller approval status is pending",
    authorizedSeller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "seller rejection reason is null",
    authorizedSeller.rejection_reason,
    null,
  );
  // 4. Retrieve seller dashboard
  const dashboard =
    await api.functional.ecommercePlatform.seller.dashboard.at(
      sellerConnection,
    );
  typia.assert(dashboard);
  // 5. Validate dashboard approvalStatus and rejectionReason
  TestValidator.equals(
    "dashboard approvalStatus is pending",
    dashboard.approvalStatus,
    "pending",
  );
  TestValidator.equals(
    "dashboard rejectionReason is null",
    dashboard.rejectionReason,
    null,
  );
  // 6. Validate shop profile information is populated
  TestValidator.predicate("shopName has value", dashboard.shopName !== "");
  TestValidator.predicate(
    "shopDescription has value",
    dashboard.shopDescription !== "",
  );
  TestValidator.predicate(
    "logoImageUri has value",
    dashboard.logoImageUri !== "",
  );
  // 7. Validate all aggregate metrics are zero
  TestValidator.equals("totalProducts is zero", dashboard.totalProducts, 0);
  TestValidator.equals("totalOrderItems is zero", dashboard.totalOrderItems, 0);
  TestValidator.equals(
    "totalPendingCancellationRequests is zero",
    dashboard.totalPendingCancellationRequests,
    0,
  );
  TestValidator.equals(
    "totalPendingRefundRequests is zero",
    dashboard.totalPendingRefundRequests,
    0,
  );
}
