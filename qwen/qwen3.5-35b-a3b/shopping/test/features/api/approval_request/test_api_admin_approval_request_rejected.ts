import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_approval_request_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminAuthResponse = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthResponse);
  typia.assert(adminAuthResponse.token);
  // 2. Create admin-specific connection for API calls
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: adminAuthResponse.token.access,
  };
  // 3. Reject a pending seller approval request
  // Note: Using random approvalRequestId assuming test environment has pending requests
  const approvalRequestId = typia.random<string & tags.Format<"uuid">>();
  const rejectionReason = "Incomplete documentation provided";
  const updatedApprovalRequest =
    await api.functional.ecommerceMall.admin.approval_requests.update(
      adminConnection,
      {
        approvalRequestId,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        },
      },
    );
  typia.assert(updatedApprovalRequest);
  // 4. Validate the approval request was rejected
  TestValidator.equals(
    "approval request status is rejected",
    updatedApprovalRequest.status,
    "rejected",
  );
  // 5. Validate rejection reason is set
  TestValidator.equals(
    "rejection reason matches input",
    updatedApprovalRequest.rejection_reason,
    rejectionReason,
  );
  // 6. Validate seller summary shows rejected status
  TestValidator.equals(
    "seller status is rejected",
    updatedApprovalRequest.seller.status,
    "rejected",
  );
  // 7. Validate dates are properly formatted
  typia.assert(updatedApprovalRequest.created_at);
  typia.assert(updatedApprovalRequest.updated_at);
  typia.assert(updatedApprovalRequest.seller.createdAt);
  typia.assert(updatedApprovalRequest.seller.updatedAt);
}
