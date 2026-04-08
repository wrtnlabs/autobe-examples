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
 * Test retrieving an approved seller approval request as an administrator.
 *
 * This test validates the administrator's ability to retrieve detailed information about a seller approval request that has been approved. The test verifies that the response contains complete seller approval request data including seller information, reviewing administrator details, approval status, and proper timestamps.
 *
 * Prerequisites and Setup:
 * 1. Administrator authenticates via POST /shoppingMall/auth/admin/join to gain access to administrative endpoints.
 * 2. A seller approval request must exist in approved status (previously submitted by a seller and reviewed/approved by an administrator through the approval workflow).
 *
 * Test Flow:
 * 1. Administrator creates account and authenticates using authorize_admin_join utility.
 * 2. Administrator calls GET /shoppingMall/admin/approval-requests/{requestId} with a valid request ID.
 * 3. Response is validated using typia.assert() to ensure complete type compliance.
 * 4. Business logic validations verify:
 *    - reviewedByAdmin is populated with the administrator who approved the request
 *    - Seller's approvalStatus reflects 'approved' state
 *    - rejectionReason is null since request was approved
 *    - Request status is 'approved'
 *
 * Note: This test assumes the test environment has pre-seeded seller approval requests in approved status. The test retrieves and validates the structure of an approved request, verifying that all required fields are present and properly populated according to the IShoppingMallSellerApprovalRequest DTO specification.
 */
export async function test_api_seller_approval_request_retrieve_approved(
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
  // 2. Generate request ID for retrieval
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve seller approval request
  const approvalRequest =
    await api.functional.shoppingMall.admin.approval_requests.at(
      adminConnection,
      {
        requestId,
      },
    );
  typia.assert(approvalRequest);
  // 4. Validate business logic - approved request specific validations
  TestValidator.equals(
    "request ID matches input",
    approvalRequest.id,
    requestId,
  );
  TestValidator.predicate(
    "status is approved",
    approvalRequest.status === "approved",
  );
  TestValidator.predicate(
    "reviewedByAdmin is populated for approved request",
    approvalRequest.reviewedByAdmin !== null,
  );
  TestValidator.predicate(
    "rejectionReason is null for approved request",
    approvalRequest.rejectionReason === null,
  );
  // 5. Validate seller approval status matches request status
  TestValidator.equals(
    "seller approvalStatus matches request status",
    approvalRequest.seller.approvalStatus,
    approvalRequest.status,
  );
  // 6. Validate reviewedByAdmin has required fields (business data, not type validation)
  if (approvalRequest.reviewedByAdmin !== null) {
    TestValidator.predicate(
      "reviewer email is not empty",
      approvalRequest.reviewedByAdmin.email.length > 0,
    );
  }
  // 7. Validate seller has required fields (business data, not type validation)
  TestValidator.predicate(
    "seller email is not empty",
    approvalRequest.seller.email.length > 0,
  );
}
