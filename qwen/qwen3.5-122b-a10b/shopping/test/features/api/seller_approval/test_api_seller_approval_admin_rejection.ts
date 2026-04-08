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
 * Test administrator rejection of seller registration approval request.
 *
 * Validates the complete seller approval rejection workflow where an administrator reviews a pending seller registration and denies it with a rejection reason. The approval status transitions from 'pending' to 'rejected', and the rejection_reason field is populated with the administrator's explanation for transparency.
 *
 * The test ensures the rejection workflow properly records the reviewing administrator's ID and review timestamp for audit purposes. Rejected sellers can view this reason and submit a new registration request after addressing the issues.
 *
 * 1. Administrator registers with email, password, and approval reason.
 * 2. Administrator authenticates with credentials.
 * 3. Seller registers with email and password, creating pending approval request.
 * 4. Administrator reviews and rejects the approval with rejection reason.
 * 5. Validates approval status changed to 'rejected'.
 * 6. Validates rejection_reason is populated with non-empty reason.
 * 7. Validates reviewedByAdmin contains administrator's summary information.
 * 8. Validates reviewedAt is a valid ISO datetime timestamp.
 */
export async function test_api_seller_approval_admin_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // 2. Administrator login
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoin.email,
      password: adminPassword,
    } satisfies IEcommerceAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 3. Seller registration (creates pending approval)
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // 4. Admin rejects the approval
  // The approval ID is the seller's ID since each seller has exactly one approval record
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const updatedApproval = await api.functional.ecommerce.admin.approvals.update(
    adminLoginConnection,
    {
      approvalId: sellerJoin.id,
      body: {
        status: "rejected",
        rejection_reason: rejectionReason,
      } satisfies IEcommerceSellerApproval.IUpdate,
    },
  );
  typia.assert(updatedApproval);
  // 5. Validate status changed to rejected
  TestValidator.equals(
    "status is rejected",
    updatedApproval.status,
    "rejected",
  );
  // 6. Validate rejection reason is populated and non-empty
  TestValidator.notEquals(
    "rejection reason is not null",
    updatedApproval.rejectionReason,
    null,
  );
  TestValidator.predicate(
    "rejection reason is non-empty",
    (updatedApproval.rejectionReason?.length ?? 0) > 0,
  );
  // 7. Validate reviewedByAdmin is set
  TestValidator.predicate(
    "reviewedByAdmin is set",
    updatedApproval.reviewedByAdmin !== null &&
      updatedApproval.reviewedByAdmin !== undefined,
  );
  // 8. Validate reviewedAt is set
  TestValidator.predicate(
    "reviewedAt is set",
    updatedApproval.reviewedAt !== null &&
      updatedApproval.reviewedAt !== undefined,
  );
  // 9. Validate seller approval status reflects rejection
  TestValidator.equals(
    "seller approval status is rejected",
    sellerJoin.approval_status,
    "rejected",
  );
}
