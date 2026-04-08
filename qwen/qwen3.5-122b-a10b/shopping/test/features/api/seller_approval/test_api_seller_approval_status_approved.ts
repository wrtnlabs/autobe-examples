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
 * Test seller approval status after administrator approval workflow.
 *
 * Validates the complete seller approval workflow from registration through administrator approval to status verification. This test ensures that the approval system correctly transitions seller status from 'pending' to 'approved' and maintains proper audit trail with administrator review information.
 *
 * The test scenario involves multiple actors and sequential operations:
 * 1. Administrator registers and authenticates
 * 2. Seller registers with pending approval status
 * 3. Administrator reviews and approves the seller registration
 * 4. Seller authenticates after approval
 * 5. Seller views their approval status to confirm 'approved' status
 *
 * Key validations include:
 * - Approval status transitions from 'pending' to 'approved'
 * - reviewedByAdmin field is populated with administrator information
 * - reviewedAt timestamp is set when approval occurs
 * - Seller can successfully retrieve their approval status
 * - Response contains complete approval record with all expected fields
 *
 * 1. Administrator registers via /ecommerce/auth/admin/join
 * 2. Administrator logs in via /ecommerce/auth/admin/login
 * 3. Seller registers via /ecommerce/auth/seller/join (creates pending approval)
 * 4. Administrator approves seller via /ecommerce/admin/approvals/{approvalId}
 * 5. Seller logs in via /ecommerce/auth/seller/login
 * 6. Seller retrieves approval status via /ecommerce/seller/approval-status
 * 7. Validates status equals 'approved'
 * 8. Validates reviewedByAdmin is not null
 * 9. Validates reviewedAt is populated
 */
export async function test_api_seller_approval_status_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: adminPassword,
    } satisfies IEcommerceAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 2. Seller registration (creates pending approval)
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
  // 3. Get seller approval record ID from approval status
  const pendingApproval =
    await api.functional.ecommerce.seller.approval_status.at(sellerConnection);
  typia.assert(pendingApproval);
  // 4. Administrator approves the seller
  const approvedApproval =
    await api.functional.ecommerce.admin.approvals.update(adminConnection, {
      approvalId: pendingApproval.id,
      body: {
        status: "approved",
      } satisfies IEcommerceSellerApproval.IUpdate,
    });
  typia.assert(approvedApproval);
  // 5. Seller login after approval
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 6. Seller retrieves approval status
  const approvalStatus =
    await api.functional.ecommerce.seller.approval_status.at(sellerConnection);
  typia.assert(approvalStatus);
  // 7. Validate approval status is 'approved'
  TestValidator.equals("approval status", approvalStatus.status, "approved");
  // 8. Validate reviewedByAdmin is populated
  TestValidator.predicate(
    "reviewedByAdmin exists",
    approvalStatus.reviewedByAdmin !== null &&
      approvalStatus.reviewedByAdmin !== undefined,
  );
  // 9. Validate reviewedAt is populated
  TestValidator.predicate(
    "reviewedAt exists",
    approvalStatus.reviewedAt !== null &&
      approvalStatus.reviewedAt !== undefined,
  );
  // 10. Validate seller information is included
  TestValidator.predicate(
    "seller information exists",
    approvalStatus.seller !== null && approvalStatus.seller !== undefined,
  );
}