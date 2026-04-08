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
 * Test administrator viewing an approved seller approval request.
 *
 * Validates that an administrator can retrieve and verify an approved seller registration request, including all audit trail metadata. The test ensures that approved requests contain proper review information including the reviewing administrator, review timestamp, and null rejection reason.
 *
 * This test operates in simulation mode where typia.random generates valid approved approval records. In production environments, pre-existing approved seller approval records are required.
 *
 * 1. Administrator registers and authenticates with the system.
 * 2. Administrator retrieves a seller approval request by ID.
 * 3. Validates the approval status is 'approved'.
 * 4. Validates the reviewing administrator information is present.
 * 5. Validates the review timestamp is populated.
 * 6. Validates the rejection reason is null for approved requests.
 * 7. Validates seller information is included in the response.
 */
export async function test_api_seller_approval_view_approved(
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
  // 2. Generate approval ID for retrieval
  const approvalId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the seller approval request
  const approval: IEcommerceSellerApproval =
    await api.functional.ecommerce.admin.approvals.at(adminConnection, {
      approvalId,
    });
  typia.assert(approval);
  // 4. Validate approval has approved status
  TestValidator.equals(
    "approval status is approved",
    approval.status,
    "approved",
  );
  // 5. Validate reviewing administrator information exists
  TestValidator.predicate(
    "reviewed by admin exists for approved request",
    approval.reviewedByAdmin !== null && approval.reviewedByAdmin !== undefined,
  );
  // 6. Validate reviewing admin has valid structure
  if (approval.reviewedByAdmin) {
    typia.assert(approval.reviewedByAdmin);
    TestValidator.predicate(
      "reviewing admin has valid ID",
      approval.reviewedByAdmin.id !== null &&
        approval.reviewedByAdmin.id !== undefined,
    );
    TestValidator.predicate(
      "reviewing admin has valid email",
      approval.reviewedByAdmin.email !== null &&
        approval.reviewedByAdmin.email !== undefined,
    );
  }
  // 7. Validate review timestamp is populated
  TestValidator.predicate(
    "reviewed at timestamp exists for approved request",
    approval.reviewedAt !== null && approval.reviewedAt !== undefined,
  );
  // 8. Validate rejection reason is null for approved requests
  TestValidator.equals(
    "rejection reason is null for approved status",
    approval.rejectionReason,
    null,
  );
  // 9. Validate seller information is present
  TestValidator.predicate(
    "seller information exists in approval",
    approval.seller !== null && approval.seller !== undefined,
  );
  // 10. Validate seller has required fields
  if (approval.seller) {
    typia.assert(approval.seller);
    TestValidator.predicate(
      "seller has valid ID",
      approval.seller.id !== null && approval.seller.id !== undefined,
    );
    TestValidator.predicate(
      "seller has valid shop name",
      approval.seller.shop_name !== null &&
        approval.seller.shop_name !== undefined,
    );
  }
  // 11. Validate approval metadata timestamps
  TestValidator.predicate("created at timestamp exists", () =>
    Boolean(approval.createdAt),
  );
  TestValidator.predicate("updated at timestamp exists", () =>
    Boolean(approval.updatedAt),
  );
  // 12. Validate approval ID format
  TestValidator.predicate("approval ID is valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      approval.id,
    ),
  );
}
