import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
import type { IEcommercePlatformSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerDashboard";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSellerApprovalRequest";
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
 * Test seller dashboard displays rejected status after admin rejection.
 *
 * Validated flow: seller joins creating automatic pending request, admin searches for pending requests by seller_id, admin rejects the request, and seller retrieves their dashboard. The dashboard correctly reflects the administrator's rejection decision.
 *
 * Validates that rejection status and admin-provided reason propagate to seller dashboard view, shop profile information persists, and all aggregate metrics remain at zero for rejected sellers unable to operate.
 *
 * 1. Register seller with random credentials (creates pending approval automatically).
 * 2. Register administrator with random credentials.
 * 3. Admin searches pending approval requests filtered by seller email.
 * 4. Admin rejects the found request with a rejection reason.
 * 5. Seller retrieves their dashboard.
 * 6. Verify approvalStatus is rejected, rejectionReason matches, shop profile present, metrics all zero.
 */
export async function test_api_seller_dashboard_rejected_status(
  connection: api.IConnection,
): Promise<void> {
  /* 1. Register seller - creates account with pending approval status */
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
    },
  });
  typia.assert(sellerAuth);
  /* 2. Register admin */
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
    },
  });
  /* 3. Admin searches for pending approval requests by seller_id */
  const requests =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          seller_id: sellerAuth.id,
        } satisfies IEcommercePlatformSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(requests);
  const pendingRequest = requests.data.find((r) => r.status === "pending");
  const requestId = pendingRequest!.id;
  /* 4. Admin rejects the seller's approval request */
  const rejectionReason = RandomGenerator.paragraph({ sentences: 3 });
  const updatedRequest =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
      adminConnection,
      {
        requestId,
        body: {
          status: "rejected",
          reason: rejectionReason,
        } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  TestValidator.equals(
    "request status is rejected",
    updatedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    updatedRequest.reason,
    rejectionReason,
  );
  /* 5. Seller retrieves their dashboard */
  const dashboard =
    await api.functional.ecommercePlatform.seller.dashboard.at(
      sellerConnection,
    );
  typia.assert(dashboard);
  /* 6. Validate dashboard shows rejected status */
  TestValidator.equals(
    "dashboard approval status is rejected",
    dashboard.approvalStatus,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches admin reason",
    dashboard.rejectionReason,
    rejectionReason,
  );
  /* Validate shop profile information is present */
  TestValidator.predicate("shopName is present", dashboard.shopName.length > 0);
  TestValidator.predicate(
    "shopDescription is present",
    dashboard.shopDescription.length > 0,
  );
  TestValidator.predicate(
    "logoImageUri is present",
    dashboard.logoImageUri.length > 0,
  );
  /* Validate aggregate metrics are zero for rejected seller */
  TestValidator.equals("total products is zero", dashboard.totalProducts, 0);
  TestValidator.equals(
    "total order items is zero",
    dashboard.totalOrderItems,
    0,
  );
  TestValidator.equals(
    "pending cancellation requests is zero",
    dashboard.totalPendingCancellationRequests,
    0,
  );
  TestValidator.equals(
    "pending refund requests is zero",
    dashboard.totalPendingRefundRequests,
    0,
  );
}
