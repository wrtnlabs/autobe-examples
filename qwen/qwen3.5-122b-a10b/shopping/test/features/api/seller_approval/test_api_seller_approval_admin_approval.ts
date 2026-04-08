import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApproval";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
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
 * Test administrator approval of seller registration requests.
 *
 * Validates the complete seller approval workflow where administrators review pending seller registrations and approve them. The test ensures that approval status transitions correctly from 'pending' to 'approved', administrator review metadata is recorded, and approved sellers gain full platform access.
 *
 * This test covers the primary success path of the seller approval system, verifying that legitimate sellers can be onboarded through administrative review while maintaining proper audit trails with reviewer identification and timestamps.
 *
 * 1. Administrator registers and authenticates with the platform.
 * 2. Seller registers creating a pending approval request.
 * 3. Administrator retrieves the approval request ID (using seller ID as approval ID).
 * 4. Administrator approves the seller registration.
 * 5. Validates approval status is 'approved'.
 * 6. Validates reviewed_by_admin_id matches the reviewing administrator.
 * 7. Validates reviewed_at timestamp is populated.
 * 8. Validates seller account shows approved status and can login.
 */
export async function test_api_seller_approval_admin_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 2. Seller registration - creates pending approval request
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // Seller should have pending approval status
  TestValidator.equals(
    "seller approval status is pending",
    sellerJoin.approval_status,
    "pending",
  );
  // 3. Administrator approves the seller
  // Note: Using seller.id as approval.id based on 1:1 relationship assumption
  // In production, this would come from a GET /ecommerce/admin/approvals endpoint
  const approval = await api.functional.ecommerce.admin.approvals.update(
    adminConnection,
    {
      approvalId: sellerJoin.id,
      body: {
        status: "approved",
      } satisfies IEcommerceSellerApproval.IUpdate,
    },
  );
  typia.assert(approval);
  // 4. Validate approval status is 'approved'
  TestValidator.equals(
    "approval status is approved",
    approval.status,
    "approved",
  );
  // 5. Validate reviewed_by_admin_id is set
  TestValidator.predicate(
    "reviewed by admin is set",
    approval.reviewedByAdmin !== null && approval.reviewedByAdmin !== undefined,
  );
  // 6. Validate reviewed_at timestamp is populated
  TestValidator.predicate(
    "reviewed at is set",
    approval.reviewedAt !== null && approval.reviewedAt !== undefined,
  );
  // 7. Validate the admin who reviewed matches our admin
  if (approval.reviewedByAdmin) {
    TestValidator.equals(
      "reviewed by correct admin",
      approval.reviewedByAdmin.id,
      adminLogin.id,
    );
  }
  // 8. Validate seller account now shows approved status (re-login seller to check)
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // Seller should now be able to login with approved status
  TestValidator.equals(
    "seller approval status after approval",
    sellerLogin.approval_status,
    "approved",
  );
  TestValidator.equals("seller ID matches", sellerLogin.id, sellerJoin.id);
}