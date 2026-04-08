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
 * Test that a seller with 'rejected' approval status can successfully reapply for registration approval.
 *
 * Validates the complete seller reapplication workflow after rejection. Ensures that sellers whose registration was denied can resubmit their application, with their approval status properly reset to 'pending' and the previous rejection reason cleared.
 *
 * Special attention is given to verifying that the status transition from 'rejected' to 'pending' occurs correctly and that the rejection reason is nullified upon reapplication.
 *
 * 1. Register a new seller account with randomized credentials (approval_status = 'pending').
 * 2. Register an administrator account with randomized credentials.
 * 3. Administrator rejects the seller's registration with a rejection reason (approval_status = 'rejected').
 * 4. Seller calls the reapply endpoint with their sellerId.
 * 5. Validates that approval_status changes from 'rejected' to 'pending'.
 * 6. Validates that rejection_reason is cleared (set to null).
 * 7. Confirms the seller can now wait for administrator review again.
 */
export async function test_api_seller_reapply_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Register administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 3. Administrator rejects the seller's registration
  const rejectionReason = "Incomplete business documentation provided.";
  const rejectedSeller =
    await api.functional.shoppingMall.administrator.sellers.reject(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          rejectionReason,
        } satisfies IShoppingMallSeller.IReject,
      },
    );
  typia.assert(rejectedSeller);
  // Verify seller is now rejected
  TestValidator.equals(
    "seller status is rejected",
    rejectedSeller.approval_status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason is set",
    rejectedSeller.rejection_reason,
    rejectionReason,
  );
  // 4. Seller reapplies for registration
  const reappliedSellerProfile =
    await api.functional.shoppingMall.seller.sellers.reapply(sellerConnection, {
      sellerId: seller.id,
    });
  typia.assert(reappliedSellerProfile);
  // 5. Validate approval_status changed from 'rejected' to 'pending'
  TestValidator.equals(
    "seller status changed to pending",
    reappliedSellerProfile.approval_status,
    "pending",
  );
  // 6. Validate rejection_reason is cleared (set to null)
  TestValidator.equals(
    "rejection reason is cleared",
    reappliedSellerProfile.rejection_reason,
    null,
  );
  // 7. Confirm seller can now wait for administrator review again
  TestValidator.predicate(
    "seller is not banned",
    reappliedSellerProfile.is_banned === false,
  );
  TestValidator.predicate(
    "seller is not suspended",
    reappliedSellerProfile.is_suspended === false,
  );
}
