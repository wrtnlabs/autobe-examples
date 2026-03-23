import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test retrieving a seller's public profile when the seller's approval request is still pending administrator review.
 *
 * Setup: Create a seller account through the seller registration flow but do NOT have an administrator approve the request yet.
 *
 * Test Steps:
 * 1. Call GET /shoppingMall/sellers/{sellerId} with the pending seller's UUID
 * 2. Verify the response returns HTTP 200 (public endpoint should still return profile data)
 * 3. Verify approval_status equals 'pending'
 * 4. Verify status equals 'active' (seller account is active even if not approved)
 * 5. Verify rejection_reason is null (no rejection yet)
 * 6. Verify all other profile fields are returned correctly
 *
 * Expected Result: HTTP 200 with seller profile data showing approval_status='pending'. This validates that pending sellers' profiles are still publicly accessible, but their products should not appear in search results (tested elsewhere).
 */
export async function test_api_seller_profile_retrieve_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration with pending approval status
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  typia.assert(seller);
  // 2. Submit seller approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(approvalRequest);
  // 3. Retrieve seller public profile using separate connection (public endpoint)
  const publicConnection: api.IConnection = { host: connection.host };
  const profile = await api.functional.shoppingMall.sellers.at(
    publicConnection,
    {
      sellerId: seller.id,
    },
  );
  typia.assert(profile);
  // 4. Verify approval_status is 'pending'
  TestValidator.equals(
    "approval_status is pending",
    profile.approval_status,
    "pending",
  );
  // 5. Verify status is 'active' (account is active even if not approved)
  TestValidator.equals("status is active", profile.status, "active");
  // 6. Verify rejection_reason is null (no rejection yet)
  TestValidator.equals(
    "rejection_reason is null",
    profile.rejection_reason,
    null,
  );
  // 7. Verify email matches the registered email
  TestValidator.equals("email matches", profile.email, seller.email);
  // 8. Verify shop_name matches
  TestValidator.equals(
    "shop_name matches",
    profile.shop_name,
    seller.shop_name,
  );
  // 9. Verify shop_description matches (can be null)
  TestValidator.equals(
    "shop_description matches",
    profile.shop_description,
    seller.shop_description,
  );
  // 10. Verify logo_image is null (not set during registration)
  TestValidator.equals("logo_image is null", profile.logo_image, null);
}
