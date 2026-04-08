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
 * Test admin approval of a pending seller registration.
 *
 * Validates the complete seller approval workflow where an administrator
 * reviews and approves a newly registered seller account. The test ensures
 * that:
 * - A seller can register and receives 'pending' approval status
 * - An administrator can authenticate and access approval endpoints
 * - The approval action changes seller status from 'pending' to 'approved'
 * - An approval record is created with the reviewing admin reference
 *
 * 1. Register new seller with pending status.
 * 2. Authenticate as administrator.
 * 3. Call approve endpoint with seller's UUID.
 * 4. Validate approval status changed to 'approved'.
 * 5. Verify approval record contains reviewing admin reference.
 */
export async function test_api_seller_approval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller with pending approval status
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // 3. Verify seller has pending approval status
  TestValidator.equals(
    "initial approval status is pending",
    sellerAuth.approvalStatus,
    "pending",
  );
  // 4. Administrator approves the pending seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: sellerAuth.id },
    );
  typia.assert(approvedSeller);
  // 5. Validate approval status changed to 'approved'
  TestValidator.equals(
    "approval status changed to approved",
    approvedSeller.approvalStatus,
    "approved",
  );
  // 6. Validate approval record was created
  TestValidator.predicate(
    "has at least one approval record",
    approvedSeller.sellerApprovals.length >= 1,
  );
  // 7. Find the latest approval record and validate
  const latestApproval =
    approvedSeller.sellerApprovals[approvedSeller.sellerApprovals.length - 1];
  TestValidator.equals(
    "approval status is approved",
    latestApproval.status,
    "approved",
  );
  // 8. Validate reviewedByAdmin reference points to authenticated admin
  TestValidator.equals(
    "reviewed by admin id matches",
    latestApproval.reviewedByAdmin?.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "reviewed by admin email matches",
    latestApproval.reviewedByAdmin?.email,
    adminAuth.email,
  );
}
