import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
 * Test retrieving a pending seller approval record by an authenticated administrator.
 *
 * Validates that an administrator can successfully retrieve details of a pending seller approval request. The test verifies that the response contains accurate approval status information, seller details, and that the pending request has not yet been reviewed. This test ensures the approval workflow correctly tracks registration requests awaiting administrative review.
 *
 * 1. Administrator registers and authenticates to obtain session credentials.
 * 2. New seller registers to automatically create a pending approval record.
 * 3. Administrator retrieves the pending approval using authenticated session.
 * 4. Validates response contains correct approvalStatus "pending", rejectionReason is null,
 *    seller summary information with email, and reviewedByAdmin is null since pending.
 */
export async function test_api_seller_approval_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Register a new seller (creates pending approval automatically)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Extract the approval ID from the seller's approval history
  const approvalId = seller.sellerApprovals[0]?.id;
  TestValidator.equals("approval exists", approvalId !== undefined, true);
  // 3. Admin retrieves the pending approval
  const approval =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.at(
      adminConnection,
      {
        approvalId: approvalId!,
      },
    );
  typia.assert(approval);
  // 4. Validate business logic values
  TestValidator.equals(
    "approvalStatus is pending",
    approval.approvalStatus,
    "pending",
  );
  TestValidator.equals(
    "rejectionReason is null",
    approval.rejectionReason,
    null,
  );
  TestValidator.equals("rejectedAt is null", approval.rejectedAt, null);
  // Validate seller summary in approvalHistory
  TestValidator.equals(
    "seller email matches",
    approval.approvalHistory[0].seller.email,
    seller.email,
  );
  TestValidator.equals(
    "seller status is pending",
    approval.approvalHistory[0].seller.approvalStatus,
    "pending",
  );
  // Validate reviewedByAdmin is null (pending, not yet reviewed)
  TestValidator.equals(
    "reviewedByAdmin is null",
    approval.approvalHistory[0].reviewedByAdmin,
    null,
  );
  // Validate approvalHistory contains pending entry
  TestValidator.equals(
    "history status is pending",
    approval.approvalHistory[0].status,
    "pending",
  );
}
