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
 * Test that an administrator can successfully reject a pending seller registration with a valid rejection reason.
 *
 * Validates the complete seller rejection workflow including:
 * - Administrator authentication and authorization
 * - Seller registration with pending approval status
 * - Administrator rejection with mandatory reason
 * - Proper status transition from 'pending' to 'rejected'
 * - Rejection details captured in sellerApprovals history
 *
 * 1. Administrator joins the platform via POST /ecommerceMall/auth/admin/join to obtain authentication tokens.
 * 2. Seller registers on the platform via POST /ecommerceMall/auth/seller/join - seller should have 'pending' approval_status.
 * 3. Administrator calls POST /ecommerceMall/admin/admin/sellers/{sellerId}/reject with the sellerId and a rejection reason.
 * 4. Validates that the seller status changes to 'rejected', rejection_reason matches, rejected_at is populated, and sellerApprovals contains the rejection record with reviewedByAdmin reference.
 */
export async function test_api_seller_rejection_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create pending seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Admin rejects the pending seller
  const rejectionReason = "Incomplete business documentation";
  const rejectedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.reject(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          rejectionReason: rejectionReason,
        } satisfies IEcommerceMallSeller.IUpdate,
      },
    );
  typia.assert(rejectedSeller);
  // 4. Validate rejection
  TestValidator.equals(
    "approval status is rejected",
    rejectedSeller.approvalStatus,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    rejectedSeller.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "rejected_at is populated",
    rejectedSeller.rejectedAt !== null &&
      rejectedSeller.rejectedAt !== undefined,
  );
  // 5. Validate sellerApprovals contains rejection record
  const latestApproval =
    rejectedSeller.sellerApprovals[rejectedSeller.sellerApprovals.length - 1];
  TestValidator.equals(
    "approval status is rejected",
    latestApproval.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason in approval record",
    latestApproval.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewedByAdmin is populated",
    latestApproval.reviewedByAdmin !== null &&
      latestApproval.reviewedByAdmin !== undefined,
  );
  TestValidator.equals(
    "reviewedByAdmin matches admin id",
    latestApproval.reviewedByAdmin!.id,
    admin.id,
  );
}
