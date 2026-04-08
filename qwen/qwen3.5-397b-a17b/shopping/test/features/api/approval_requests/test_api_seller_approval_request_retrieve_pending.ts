import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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

/**
 * Test retrieving a pending seller approval request as an administrator.
 *
 * Validates the complete workflow for administrators to retrieve seller approval request details. Ensures that authenticated administrators can access pending approval requests with all required fields including seller information, status, and timestamps.
 *
 * The test verifies that pending requests have null reviewedByAdmin and rejectionReason fields, indicating they await administrator review. Seller information is properly joined and returned with the approval request.
 *
 * 1. Administrator authenticates via /shoppingMall/auth/admin/join.
 * 2. Admin calls GET /shoppingMall/admin/approval-requests/{requestId} with valid UUID.
 * 3. Verify response contains complete seller approval request data.
 * 4. Validate seller information is correctly joined and returned.
 * 5. Validate status reflects pending state and reviewedByAdmin is null.
 * 6. Validate timestamps are properly formatted in ISO 8601.
 */
export async function test_api_seller_approval_request_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate valid request ID and retrieve approval request
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const approvalRequest =
    await api.functional.shoppingMall.admin.approval_requests.at(
      adminConnection,
      {
        requestId,
      },
    );
  typia.assert(approvalRequest);
  // 3. Validate business logic - pending status fields
  TestValidator.equals("request ID matches", approvalRequest.id, requestId);
  TestValidator.equals("status is pending", approvalRequest.status, "pending");
  TestValidator.equals(
    "reviewedByAdmin is null",
    approvalRequest.reviewedByAdmin,
    null,
  );
  TestValidator.equals(
    "rejectionReason is null",
    approvalRequest.rejectionReason,
    null,
  );
  TestValidator.equals("deletedAt is null", approvalRequest.deletedAt, null);
  // 4. Validate seller business logic
  TestValidator.predicate(
    "seller approvalStatus is pending",
    approvalRequest.seller.approvalStatus === "pending",
  );
}
