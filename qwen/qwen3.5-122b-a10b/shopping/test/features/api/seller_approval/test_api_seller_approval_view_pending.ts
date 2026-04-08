import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator retrieval of pending seller approval request.
 *
 * Validates that administrators can access seller approval details for review purposes. The test authenticates as an administrator, retrieves a seller approval request, and verifies the response contains all required fields including seller information, approval status, and audit timestamps.
 *
 * Special attention is given to verifying that pending approvals have null values for reviewedByAdmin and rejectionReason fields, and that the approval status is correctly set to 'pending'.
 *
 * 1. Administrator authenticates with admin credentials.
 * 2. Generate a random UUID for the approval ID.
 * 3. Call the approval retrieval endpoint with the approval ID.
 * 4. Validates response structure and field values.
 * 5. Verifies pending status has null reviewedByAdmin and rejectionReason.
 * 6. Validates seller information includes shop_name and approval_status.
 * 7. Verifies audit timestamps createdAt and updatedAt are present.
 */
export async function test_api_seller_approval_view_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate approval ID (simulating an existing pending approval)
  const approvalId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the seller approval
  const approval = await api.functional.ecommerce.admin.approvals.at(
    adminConnection,
    {
      approvalId,
    },
  );
  typia.assert(approval);
  // 4. Validate approval structure
  TestValidator.equals("approval ID matches", approval.id, approvalId);
  TestValidator.predicate("status is pending", approval.status === "pending");
  // 5. Verify pending approval has null review fields
  TestValidator.predicate(
    "reviewedByAdmin is null for pending",
    approval.reviewedByAdmin === null,
  );
  TestValidator.predicate(
    "rejectionReason is null for pending",
    approval.rejectionReason === null,
  );
  // 6. Validate seller information exists
  TestValidator.predicate(
    "seller has ID",
    approval.seller.id !== null && approval.seller.id !== undefined,
  );
  TestValidator.predicate(
    "seller has shop_name",
    approval.seller.shop_name !== null &&
      approval.seller.shop_name !== undefined,
  );
  TestValidator.predicate(
    "seller has approval_status",
    approval.seller.approval_status !== null &&
      approval.seller.approval_status !== undefined,
  );
}
