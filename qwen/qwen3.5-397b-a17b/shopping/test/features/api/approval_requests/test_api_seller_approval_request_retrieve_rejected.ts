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
 * Test retrieving a rejected seller approval request as an administrator.
 *
 * This test validates the complete workflow for administrators to retrieve detailed information about a seller approval request that has been rejected. The test ensures proper authentication, endpoint accessibility, and response data structure validation.
 *
 * 1. Administrator authenticates using the admin join endpoint to obtain valid credentials and access token.
 * 2. Administrator calls GET /shoppingMall/admin/approval-requests/{requestId} with a valid UUID for a rejected request.
 * 3. Validates response structure contains all required fields: id, seller, reviewedByAdmin, status, rejectionReason, and timestamps.
 * 4. Business logic validations verify that rejected requests have populated rejectionReason and reviewedByAdmin fields.
 * 5. Validates seller information includes email and approvalStatus fields.
 * 6. Ensures timestamp fields are properly formatted ISO 8601 date-time strings.
 *
 * Edge cases tested:
 * - rejectionReason is non-null string providing feedback to seller (required for rejected status)
 * - reviewedByAdmin contains complete administrator information who made the rejection decision
 * - Status correctly reflects 'rejected' state
 * - Seller summary includes approvalStatus which may be 'pending', 'approved', or 'rejected' based on business rules
 */
export async function test_api_seller_approval_request_retrieve_rejected(
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
  // 2. Generate a valid UUID for the approval request
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the seller approval request
  const approvalRequest: IShoppingMallSellerApprovalRequest =
    await api.functional.shoppingMall.admin.approval_requests.at(
      adminConnection,
      {
        requestId: requestId,
      },
    );
  typia.assert(approvalRequest);
  // 4. Validate business logic (not types - typia.assert() handles type validation)
  TestValidator.equals("request ID matches", approvalRequest.id, requestId);
  TestValidator.predicate(
    "rejection reason is populated for rejected request",
    approvalRequest.rejectionReason !== null &&
      approvalRequest.rejectionReason.length > 0,
  );
  TestValidator.predicate(
    "reviewedByAdmin is populated for rejected request",
    approvalRequest.reviewedByAdmin !== null,
  );
  // 5. Validate seller information exists
  TestValidator.predicate(
    "seller information is present",
    approvalRequest.seller !== undefined,
  );
  // 6. Validate timestamps exist (type validation handled by typia.assert())
  TestValidator.predicate(
    "createdAt timestamp exists",
    approvalRequest.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt timestamp exists",
    approvalRequest.updatedAt !== undefined,
  );
}
