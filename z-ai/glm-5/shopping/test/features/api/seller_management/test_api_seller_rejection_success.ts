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
 * Test the primary success path where an administrator successfully rejects
 * a pending seller registration.
 *
 * Test Flow:
 * 1. Create admin account via /auth/admin/join
 * 2. Create seller account via /auth/seller/join (creates seller with approval_status='pending')
 * 3. Call PUT /shoppingMall/admin/sellers/{sellerId}/reject with a valid rejection reason
 * 4. Verify response returns IShoppingMallSeller with:
 *    - approval_status changed to 'rejected'
 *    - rejection_reason populated with the provided reason
 *    - updated_at timestamp updated
 * 5. Verify the seller can view their rejection reason when checking their status
 */
export async function test_api_seller_rejection_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create seller account (pending status by default)
  // Store the password for later login attempt
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: { password: sellerPassword },
  });
  typia.assert(sellerAuth);
  // Verify seller initially has pending status
  TestValidator.equals(
    "seller approval_status is pending",
    sellerAuth.approvalStatus,
    "pending",
  );
  // Store the created_at timestamp before rejection for comparison
  const createdAt = sellerAuth.createdAt;
  const sellerId = sellerAuth.id;
  // 3. Admin rejects the seller with a valid reason (minimum 10 characters)
  const rejectionReason =
    "Your application does not meet our minimum requirements for seller verification. Please provide more detailed business information.";
  const rejectedSeller = await api.functional.shoppingMall.admin.sellers.reject(
    adminConnection,
    {
      sellerId,
      body: { reason: rejectionReason } satisfies IShoppingMallSeller.IReject,
    },
  );
  typia.assert(rejectedSeller);
  // 4. Validate the rejection response
  // approval_status should be changed to 'rejected'
  TestValidator.equals(
    "approval_status changed to rejected",
    rejectedSeller.approvalStatus,
    "rejected",
  );
  // rejection_reason should match the provided reason
  TestValidator.equals(
    "rejection_reason matches",
    rejectedSeller.rejectionReason,
    rejectionReason,
  );
  // updated_at should be later than created_at
  TestValidator.predicate(
    "updated_at is later than created_at",
    rejectedSeller.updatedAt > createdAt,
  );
  // All original seller data should be preserved
  TestValidator.equals("seller id preserved", rejectedSeller.id, sellerId);
  TestValidator.equals(
    "seller email preserved",
    rejectedSeller.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "seller shopName preserved",
    rejectedSeller.shopName,
    sellerAuth.shopName,
  );
  // 5. Verify the seller can view their rejection reason when logging in
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginAuth = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: "https://test.example.com/seller/login",
      referrer: "https://test.example.com/",
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLoginAuth);
  // The seller should see their rejection status and reason
  TestValidator.equals(
    "seller sees rejection status",
    sellerLoginAuth.approvalStatus,
    "rejected",
  );
  TestValidator.equals(
    "seller sees rejection reason",
    sellerLoginAuth.rejectionReason,
    rejectionReason,
  );
}
