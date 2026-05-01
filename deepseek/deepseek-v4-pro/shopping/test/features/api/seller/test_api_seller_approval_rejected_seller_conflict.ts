import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
 * Test that attempting to approve a rejected seller returns 409 Conflict.
 *
 * Validates the business rule that a rejected seller must submit a new registration request before approval can be granted. The approval workflow enforces that only sellers in "pending" status can be approved — rejected sellers are blocked from direct approval.
 *
 * This test covers the full rejection-then-approve conflict flow and verifies that the server correctly rejects the approval attempt with HTTP 409 status, preserving the seller's rejected state.
 *
 * 1. Seller joins the platform, creating an account in "pending" approval status.
 * 2. Administrator registers and rejects the seller's registration with a reason.
 * 3. Verifies the seller's approval status transitions to "rejected".
 * 4. Administrator attempts to approve the now-rejected seller.
 * 5. Validates the server responds with 409 Conflict, blocking the approval.
 */
export async function test_api_seller_approval_rejected_seller_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account in pending status
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. Reject the seller
  const rejectedSeller = await api.functional.shoppingMall.admin.sellers.reject(
    adminConnection,
    {
      sellerId: seller.id,
      body: {
        rejection_reason: "Registration documentation incomplete",
      } satisfies IShoppingMallSeller.IReject,
    },
  );
  typia.assert(rejectedSeller);
  // 4. Verify seller is now rejected
  TestValidator.equals(
    "approval status",
    rejectedSeller.approval_status,
    "rejected",
  );
  // 5. Attempt to approve rejected seller — must return 409 Conflict
  await TestValidator.httpError(
    "rejected seller cannot be approved",
    409,
    async () => {
      await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
        sellerId: seller.id,
      });
    },
  );
}
