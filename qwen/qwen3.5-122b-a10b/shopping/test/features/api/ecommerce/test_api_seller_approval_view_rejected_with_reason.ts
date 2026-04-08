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
 * Test administrator retrieval of rejected seller approval with reason tracking.
 *
 * Validates that administrators can access rejected seller approval requests and verify the rejection reason, review timestamp, and reviewing administrator information. This ensures the approval workflow maintains proper audit trails and transparency for seller registration decisions.
 *
 * The test authenticates an administrator, retrieves a seller approval record, and validates all rejection-related fields are properly populated including the rejection reason, review timestamp, and reviewing administrator reference.
 *
 * 1. Administrator registers and authenticates with admin credentials.
 * 2. Administrator retrieves seller approval by approval ID.
 * 3. Validates approval status is 'rejected'.
 * 4. Validates rejection reason is present and non-empty.
 * 5. Validates reviewed timestamp is populated.
 * 6. Validates reviewing administrator information is included.
 */
export async function test_api_seller_approval_view_rejected_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve seller approval by ID
  const approvalId = typia.random<string & tags.Format<"uuid">>();
  const approval = await api.functional.ecommerce.admin.approvals.at(
    adminConnection,
    {
      approvalId,
    },
  );
  typia.assert(approval);
  // 3. Validate rejection workflow fields
  TestValidator.equals(
    "approval status is rejected",
    approval.status,
    "rejected",
  );
  TestValidator.predicate(
    "rejection reason exists",
    approval.rejectionReason !== null &&
      approval.rejectionReason !== undefined &&
      approval.rejectionReason.length > 0,
  );
  TestValidator.predicate(
    "reviewed timestamp exists",
    approval.reviewedAt !== null && approval.reviewedAt !== undefined,
  );
  TestValidator.predicate(
    "reviewing admin exists",
    approval.reviewedByAdmin !== null && approval.reviewedByAdmin !== undefined,
  );
  TestValidator.predicate(
    "seller information exists",
    approval.seller !== null && approval.seller !== undefined,
  );
}
