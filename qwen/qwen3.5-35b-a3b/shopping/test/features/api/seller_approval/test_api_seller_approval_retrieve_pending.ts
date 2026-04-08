import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * End-to-end test for retrieving a pending seller approval request awaiting administrator review.
 *
 * Validates the retrieval of seller approval requests in pending state, ensuring that administrators can view complete request details including seller information, timestamps, and approval state. Verifies that pending requests have null reviewer and rejection reason fields, and that seller approval status remains pending.
 *
 * Special attention is given to validating that the response structure conforms to the seller approval request DTO, with proper handling of null fields for pending state and correct ISO 8601 timestamp formatting.
 *
 * 1. Create administrator account for authentication.
 * 2. Retrieve seller approval request by UUID.
 * 3. Validate response contains pending status with null reviewer.
 * 4. Verify seller information matches pending state requirements.
 * 5. Confirm timestamp fields are valid ISO 8601 formatted datetime.
 */
export async function test_api_seller_approval_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminJoinConnection, {});
  typia.assert(adminAuth);
  // 2. Create administrator connection with proper Bearer token format
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminAuth.token.access}` },
  };
  // 3. Generate test request ID (UUID format)
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve seller approval request
  const approvalRequest =
    await api.functional.ecommerceMall.administrator.seller_approvals.at(
      adminConnection,
      { requestId },
    );
  typia.assert(approvalRequest);
  // 5. Validate response structure
  TestValidator.equals("request ID matches", approvalRequest.id, requestId);
  TestValidator.equals("status is pending", approvalRequest.status, "pending");
  // 6. Validate seller information for pending state
  TestValidator.equals(
    "seller approval status pending",
    approvalRequest.seller.approval_status,
    "pending",
  );
  TestValidator.predicate(
    "seller has display name",
    approvalRequest.seller.display_name.length > 0,
  );
  TestValidator.predicate(
    "seller has email",
    approvalRequest.seller.email !== undefined,
  );
  // 7. Validate null fields for pending state
  TestValidator.equals("reviewer is null", approvalRequest.reviewer, null);
  TestValidator.equals(
    "rejection reason is null",
    approvalRequest.rejectionReason,
    null,
  );
  // 8. Validate request reason is present
  TestValidator.predicate(
    "request reason present",
    approvalRequest.requestReason !== null &&
      approvalRequest.requestReason.length > 0,
  );
  // 9. Validate timestamps
  TestValidator.predicate(
    "created at is valid datetime",
    !isNaN(Date.parse(approvalRequest.createdAt)),
  );
  TestValidator.predicate(
    "updated at is valid datetime",
    !isNaN(Date.parse(approvalRequest.updatedAt)),
  );
  TestValidator.equals("deleted at is null", approvalRequest.deletedAt, null);
  // 10. Validate admin connection is properly configured
  TestValidator.equals("admin email exists", adminAuth.email !== undefined, true);
  TestValidator.equals("admin grade is regular", adminAuth.grade, "regular");
  TestValidator.equals("admin not banned", adminAuth.is_banned, false);
}