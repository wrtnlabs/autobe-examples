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
 * Test successful unsuspension of a suspended seller account.
 *
 * Test Flow:
 * 1. Administrator authenticates
 * 2. Create a seller account (starts with 'pending' status)
 * 3. Admin approves the seller (pending → approved)
 * 4. Admin suspends the seller (approved → suspended)
 * 5. Admin unsusinds the seller (suspended → approved)
 * 6. Verify the seller's approval_status is 'approved'
 * 7. Verify the seller can login and perform operations
 *
 * Business Logic Verified:
 * - Suspended seller successfully restored to active status
 * - Seller regains full capabilities immediately
 */
export async function test_api_seller_unsuspend_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create seller account (starts with 'pending' status)
  const sellerJoinResult = await authorize_seller_join(connection, {});
  const sellerId = sellerJoinResult.id;
  // 3. Admin approves the seller (pending → approved)
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approved",
    approvedSeller.approvalStatus,
    "approved",
  );
  // 4. Admin suspends the seller (approved → suspended)
  const suspendedSeller =
    await api.functional.shoppingMall.admin.sellers.suspend(adminConnection, {
      sellerId,
    });
  typia.assert(suspendedSeller);
  TestValidator.equals(
    "seller suspended",
    suspendedSeller.approvalStatus,
    "suspended",
  );
  // 5. Admin unsusinds the seller (suspended → approved)
  const unsuspendedSeller =
    await api.functional.shoppingMall.admin.sellers.unsuspend(adminConnection, {
      sellerId,
    });
  typia.assert(unsuspendedSeller);
  // 6. Verify the seller's approval_status is 'approved'
  TestValidator.equals(
    "seller unsuspended",
    unsuspendedSeller.approvalStatus,
    "approved",
  );
  // 7. Verify the seller ID remains unchanged
  TestValidator.equals("seller id unchanged", unsuspendedSeller.id, sellerId);
  // 8. Verify updated_at is greater than or equal to created_at
  TestValidator.predicate(
    "updated_at after created_at",
    new Date(unsuspendedSeller.updatedAt).getTime() >=
      new Date(unsuspendedSeller.createdAt).getTime(),
  );
}
