import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";

/**
 * Test the rejection workflow where an administrator rejects a pending seller with a reason.
 *
 * **Pre-conditions:**
 * - An admin account exists and is authenticated
 * - A seller account with 'pending' approval status exists
 *
 * **Test Steps:**
 * 1. Authenticate as admin via POST /ecommerceMall/auth/admin/join
 * 2. Register a new seller via POST /ecommerceMall/auth/seller/join (creates seller with pending status)
 * 3. Submit rejection request via POST /ecommerceMall/admin/seller-approvals with:
 *    - sellerId: UUID of the pending seller
 *    - status: 'rejected'
 *    - rejectionReason: 'Incomplete business documentation' (required for rejection)
 *
 * **Expected Results:**
 * - Response status: 201 Created
 * - Response body contains IEcommerceMallSellerApproval with:
 *   - status: 'rejected'
 *   - seller.approval_status: 'rejected'
 *   - rejectionReason: 'Incomplete business documentation'
 *   - reviewedByAdmin: not null
 * - Rejected seller can view rejection reason and submit new registration
 */
export async function test_api_seller_approval_reject_pending_seller_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // Step 2: Register a new seller (creates seller with 'pending' status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Verify seller has 'pending' approval status initially
  TestValidator.equals(
    "seller approval status is pending",
    sellerAuth.approval_status,
    "pending",
  );
  // Step 3: Admin rejects the pending seller with a reason
  const rejectionReason = "Incomplete business documentation";
  const approval =
    await api.functional.ecommerceMall.admin.seller_approvals.create(
      adminConnection,
      {
        body: {
          sellerId: sellerAuth.id,
          status: "rejected",
          rejectionReason: rejectionReason,
        } satisfies IEcommerceMallSellerApproval.ICreate,
      },
    );
  typia.assert(approval);
  // Step 4: Validate rejection response
  TestValidator.equals(
    "approval status is rejected",
    approval.status,
    "rejected",
  );
  TestValidator.equals(
    "seller approval status is rejected",
    approval.seller.approval_status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    approval.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewedByAdmin is not null",
    approval.reviewedByAdmin !== null,
  );
  TestValidator.equals(
    "reviewedByAdmin id matches admin id",
    approval.reviewedByAdmin!.id,
    adminAuth.id,
  );
}
