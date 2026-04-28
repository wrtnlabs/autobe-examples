import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
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
 * Admin rejects a pending seller approval request with a mandatory rejection reason.
 *
 * Validates the complete admin rejection workflow for seller registration approvals. An administrator reviews and denies a seller's application, providing a clear business justification for the decision. The system must persist the rejection status and reason, making them visible to the affected seller.
 *
 * Business rules enforced: rejection reason is required when denying an application, ensuring transparency and enabling sellers to understand and potentially address the concerns. The updated approval request record maintains referential integrity with the original seller profile.
 *
 * 1. Administrator registers and authenticates to the platform.
 * 2. Seller registers their account, auto-creating a pending approval request.
 * 3. Administrator updates the approval request status to 'rejected' with a reason.
 * 4. Validates the approval request reflects rejected status with the stored reason.
 */
export async function test_api_seller_approval_admin_reject_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register seller (auto-creates pending approval request)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await authorize_seller_join(sellerConnection, {
    body: { email: sellerEmail },
  });
  typia.assert(seller);
  // 3. Admin rejects the seller's approval request with reason
  const rejectionReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const body = {
    status: "rejected",
    reason: rejectionReason,
  } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate;
  const approvalRequest =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
      adminConnection,
      {
        requestId: seller.id,
        body,
      },
    );
  typia.assert(approvalRequest);
  // 4. Validate rejection workflow
  TestValidator.equals(
    "approval request status is rejected",
    approvalRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason is stored",
    approvalRequest.reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "rejection reason is not null after rejection",
    approvalRequest.reason !== null,
  );
  TestValidator.equals(
    "seller information preserved",
    approvalRequest.seller.email,
    sellerEmail,
  );
}
