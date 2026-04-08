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
 * Test the seller approval workflow after rejection and reapplication.
 *
 * Validates the complete seller approval lifecycle including initial rejection, reapplication, and subsequent approval. Ensures that when a seller's application is rejected and then reapproved, all status fields are correctly updated and the rejection reason is cleared.
 *
 * The test verifies that the approval workflow properly handles the transition from rejected to pending (via reapplication) and then to approved status, maintaining data integrity throughout the process.
 *
 * 1. Administrator registers and authenticates to the system.
 * 2. Seller registers with pending approval status.
 * 3. Administrator rejects the seller's application with a rejection reason.
 * 4. Seller reapplies after rejection, returning to pending status.
 * 5. Administrator approves the seller's reapplication with an approval reason.
 * 6. Validates that approval_status is 'approved', rejection_reason is cleared, and approval_reason is set.
 */
export async function test_api_seller_approval_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin_approval_test@test.com",
      password: "AdminPassword123",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
    },
  });
  typia.assert(adminAuth);
  // 2. Seller registration (pending status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller_reapply_test@test.com",
      password: "SellerPassword123",
      href: "https://test.com/seller/join",
      referrer: "https://test.com/seller",
    },
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 3. Administrator rejects the seller's application
  const rejectedSeller =
    await api.functional.shoppingMall.administrator.sellers.reject(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          rejectionReason: "Incomplete business documentation provided.",
        } satisfies IShoppingMallSeller.IReject,
      },
    );
  typia.assert(rejectedSeller);
  TestValidator.equals(
    "seller rejected",
    rejectedSeller.approval_status,
    "rejected",
  );
  TestValidator.predicate(
    "rejection reason set",
    rejectedSeller.rejection_reason !== null,
  );
  // 4. Seller reapplies after rejection
  const sellerReapplyConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerReapplyConnection, {
    body: {
      email: "seller_reapply_test@test.com",
      password: "SellerPassword123",
      href: "https://test.com/seller/login",
      referrer: "https://test.com/seller",
    } satisfies IShoppingMallSeller.ILogin,
  });
  const reappliedProfile =
    await api.functional.shoppingMall.seller.sellers.reapply(
      sellerReapplyConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(reappliedProfile);
  TestValidator.equals(
    "seller pending after reapply",
    reappliedProfile.approval_status,
    "pending",
  );
  TestValidator.equals(
    "rejection reason cleared on reapply",
    reappliedProfile.rejection_reason,
    null,
  );
  // 5. Administrator approves the seller's reapplication
  const approvedSeller =
    await api.functional.shoppingMall.administrator.sellers.approve(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          approval_reason:
            "Documentation completed and verified. Seller approved for reapplication.",
        } satisfies IShoppingMallSeller.IApprove,
      },
    );
  typia.assert(approvedSeller);
  // 6. Validate approval results
  TestValidator.equals(
    "seller approved",
    approvedSeller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "rejection reason cleared",
    approvedSeller.rejection_reason,
    null,
  );
  TestValidator.equals(
    "approval reason set",
    approvedSeller.approval_reason,
    "Documentation completed and verified. Seller approved for reapplication.",
  );
  TestValidator.predicate(
    "updated_at exists",
    approvedSeller.updated_at !== undefined,
  );
  TestValidator.predicate(
    "shop name exists",
    approvedSeller.shop_name !== undefined,
  );
  TestValidator.predicate(
    "shop description exists",
    approvedSeller.shop_description !== undefined,
  );
}
