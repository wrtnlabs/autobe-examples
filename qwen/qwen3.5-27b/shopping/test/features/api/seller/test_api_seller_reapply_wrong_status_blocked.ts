import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that sellers with approval status other than 'rejected' cannot use the reapply endpoint.
 *
 * Validates the business rule that the reapply endpoint is exclusively available for sellers whose registration was rejected. Sellers with 'pending' or 'approved' status should receive an error when attempting to reapply.
 *
 * The test covers two scenarios:
 * 1. A newly registered seller with 'pending' status attempts to reapply and receives an error
 * 2. A seller approved by an administrator attempts to reapply and receives an error
 *
 * This ensures that the reapply functionality is properly restricted to only rejected sellers who need to resubmit their registration for review.
 *
 * 1. Register a new seller account (creates seller with 'pending' status)
 * 2. Seller attempts to call reapply endpoint with pending status
 * 3. Validate that reapply fails with appropriate error for pending status
 * 4. Register a second seller account
 * 5. Register an administrator account
 * 6. Administrator approves the second seller (changes status to 'approved')
 * 7. Second seller attempts to call reapply endpoint with approved status
 * 8. Validate that reapply fails with appropriate error for approved status
 */
export async function test_api_seller_reapply_wrong_status_blocked(
  connection: api.IConnection,
): Promise<void> {
  // Scenario A: Pending Status
  // 1. Register a new seller account (creates seller with 'pending' status)
  const sellerPendingConnection: api.IConnection = { host: connection.host };
  const sellerPending = await authorize_seller_join(sellerPendingConnection, {
    body: {},
  });
  typia.assert(sellerPending);
  // Validate seller has 'pending' status
  TestValidator.equals(
    "pending seller approval_status",
    sellerPending.approval_status,
    "pending",
  );
  // 2. Seller attempts to call reapply endpoint with pending status
  // 3. Validate that reapply fails with appropriate error for pending status
  await TestValidator.error("reapply fails for pending seller", async () => {
    await api.functional.shoppingMall.seller.sellers.reapply(
      sellerPendingConnection,
      {
        sellerId: sellerPending.id,
      },
    );
  });
  // Scenario B: Approved Status
  // 4. Register a second seller account
  const sellerApprovedConnection: api.IConnection = { host: connection.host };
  const sellerApproved = await authorize_seller_join(sellerApprovedConnection, {
    body: {},
  });
  typia.assert(sellerApproved);
  // 5. Register an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // 6. Administrator approves the second seller (changes status to 'approved')
  const approvedSeller =
    await api.functional.shoppingMall.administrator.sellers.approve(
      adminConnection,
      {
        sellerId: sellerApproved.id,
        body: {
          approval_reason: "Test approval for E2E testing",
        } satisfies IShoppingMallSeller.IApprove,
      },
    );
  typia.assert(approvedSeller);
  // Validate seller has 'approved' status
  TestValidator.equals(
    "approved seller approval_status",
    approvedSeller.approval_status,
    "approved",
  );
  // 7. Second seller attempts to call reapply endpoint with approved status
  // 8. Validate that reapply fails with appropriate error for approved status
  await TestValidator.error("reapply fails for approved seller", async () => {
    await api.functional.shoppingMall.seller.sellers.reapply(
      sellerApprovedConnection,
      {
        sellerId: sellerApproved.id,
      },
    );
  });
}
