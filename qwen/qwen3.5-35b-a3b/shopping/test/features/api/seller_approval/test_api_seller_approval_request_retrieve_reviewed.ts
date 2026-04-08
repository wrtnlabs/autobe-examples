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
 * Test retrieving an approved or rejected seller approval request with reviewer information.
 *
 * Validates the retrieval of a seller approval request that has been reviewed by an administrator,
 * ensuring that the response includes the reviewer details (id, display_name, grade) and that
 * the seller information is correctly joined. The test creates an administrator account to access
 * the endpoint and verifies that the approval request response includes all required fields including
 * the reviewer object when the status is no longer pending.
 *
 * Special attention is given to verifying that the reviewer object is only populated when the
 * request has been reviewed (status is 'approved' or 'rejected'), and that the seller information
 * is always included regardless of status.
 *
 * 1. Administrator joins and authenticates with the platform.
 * 2. Administrator retrieves a seller approval request by ID.
 * 3. Validates that the response includes seller information with approval status.
 * 4. Validates that the response includes reviewer information when status is not pending.
 * 5. Validates that rejection reason is null for approved requests.
 */
export async function test_api_seller_approval_request_retrieve_reviewed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    },
  });
  typia.assert(admin);
  // 2. Generate seller data for testing
  const seller: IEcommerceMallSeller.ISummary =
    typia.random<IEcommerceMallSeller.ISummary>();
  seller.approval_status = "pending";
  // 3. Create approval request with random ID for retrieval
  const approvalRequestId = typia.random<string & tags.Format<"uuid">>();
  const requestReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  // 4. Retrieve approval request via SDK
  const retrieved: IEcommerceMallSellerApprovalRequest =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.at(
      adminConnection,
      {
        requestId: approvalRequestId,
      },
    );
  typia.assert(retrieved);
  // 5. Validate response structure
  TestValidator.equals("approval request id", retrieved.id, approvalRequestId);
  TestValidator.equals(
    "seller information present",
    retrieved.seller !== null,
    true,
  );
  TestValidator.equals("status is valid", retrieved.status, "approved");
  TestValidator.equals(
    "request reason is string",
    typeof retrieved.requestReason,
    "string",
  );
  TestValidator.equals(
    "request reason length",
    retrieved.requestReason.length > 0,
    true,
  );
  // 6. Validate reviewer information is populated when status is not pending
  TestValidator.notEquals(
    "reviewer is populated when approved",
    retrieved.reviewer,
    null,
  );
  // 7. Validate reviewer contains expected administrator summary fields
  typia.assertGuard(retrieved.reviewer!);
  TestValidator.notEquals("reviewer id exists", retrieved.reviewer!.id, "");
  TestValidator.predicate(
    "reviewer has display name",
    () => retrieved.reviewer!.displayName.length > 0,
  );
  TestValidator.predicate(
    "reviewer has grade",
    () =>
      retrieved.reviewer!.grade === "regular" ||
      retrieved.reviewer!.grade === "super",
  );
  TestValidator.predicate(
    "reviewer has email",
    () => retrieved.reviewer!.email.length > 0,
  );
  TestValidator.predicate(
    "reviewer has creation timestamp",
    () => retrieved.reviewer!.createdAt !== undefined,
  );
  TestValidator.predicate(
    "reviewer has update timestamp",
    () => retrieved.reviewer!.updatedAt !== undefined,
  );
  TestValidator.predicate(
    "reviewer has deletion timestamp",
    () =>
      retrieved.reviewer!.deletedAt === null ||
      retrieved.reviewer!.deletedAt !== undefined,
  );
  // 8. Validate rejection reason is null for approved status
  TestValidator.equals(
    "rejection reason is null for approved",
    retrieved.rejectionReason,
    null,
  );
  // 9. Validate seller summary fields
  typia.assertGuard(retrieved.seller);
  TestValidator.notEquals("seller id exists", retrieved.seller.id, "");
  TestValidator.predicate(
    "seller has display name",
    () => retrieved.seller.display_name.length > 0,
  );
  TestValidator.predicate(
    "seller approval status exists",
    () => retrieved.seller.approval_status.length > 0,
  );
  TestValidator.predicate(
    "seller is suspended flag exists",
    () => typeof retrieved.seller.is_suspended === "boolean",
  );
  TestValidator.predicate(
    "seller has creation timestamp",
    () => retrieved.seller.created_at.length > 0,
  );
}
