import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
 * Test the seller reapplication workflow after admin rejection.
 *
 * Scenario:
 * 1. Admin registers and logs in
 * 2. Seller registers (status becomes 'pending')
 * 3. Admin rejects the seller with a reason
 * 4. Verify seller's approval_status is 'rejected' with rejection_reason populated
 * 5. Seller reapplies for approval
 * 6. Verify seller's approval_status is reset to 'pending' and rejection_reason is cleared
 */
export async function test_api_seller_reapply_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Seller registration (status becomes 'pending')
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  TestValidator.equals(
    "initial approval status is pending",
    sellerAuth.approvalStatus,
    "pending",
  );
  // 3. Admin rejects the seller
  const rejectionReason =
    "Your shop information is incomplete. Please provide more detailed description.";
  const rejectedSeller = await api.functional.shoppingMall.admin.sellers.reject(
    adminConnection,
    {
      sellerId: sellerAuth.id,
      body: { reason: rejectionReason } satisfies IShoppingMallSeller.IReject,
    },
  );
  typia.assert(rejectedSeller);
  // 4. Verify seller status is 'rejected' with rejection_reason
  TestValidator.equals(
    "approval status after rejection",
    rejectedSeller.approvalStatus,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason is set",
    rejectedSeller.rejectionReason,
    rejectionReason,
  );
  // 5. Seller reapplies
  const reappliedSeller = await api.functional.shoppingMall.seller.reapply(
    sellerConnection,
    {
      body: {} satisfies IShoppingMallSeller.IReapply,
    },
  );
  typia.assert(reappliedSeller);
  // 6. Verify seller status is 'pending' and rejection_reason is cleared
  TestValidator.equals(
    "approval status after reapply",
    reappliedSeller.approvalStatus,
    "pending",
  );
  TestValidator.equals(
    "rejection reason is cleared",
    reappliedSeller.rejectionReason,
    null,
  );
}
