import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
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
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test retrieving a seller's public profile when the seller has been approved by administrators.
 *
 * Setup:
 * 1. Create an admin account and authenticate
 * 2. Create a seller account through registration flow
 * 3. Submit seller approval request
 * 4. Admin approves the seller request
 *
 * Test Steps:
 * 1. Call GET /shoppingMall/sellers/{sellerId} with the approved seller's UUID
 * 2. Verify the response contains all expected fields
 * 3. Verify approval_status equals 'approved'
 * 4. Verify status equals 'active' (not banned)
 * 5. Verify timestamp fields are in ISO 8601 format
 * 6. Verify nullable fields are properly handled as null when not set
 */
export async function test_api_seller_profile_retrieve_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
    },
  });
  typia.assert(adminAuth);
  // 2. Seller setup - create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      shop_name: RandomGenerator.name(2),
      href: "https://example.com/seller/join",
      referrer: "https://example.com",
    },
  });
  typia.assert(sellerAuth);
  // 3. Submit seller approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(approvalRequest);
  // 4. Admin approves the seller request
  const updatedRequest =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Retrieve seller profile
  const sellerProfile = await api.functional.shoppingMall.sellers.at(
    { host: connection.host },
    {
      sellerId: sellerAuth.id,
    },
  );
  typia.assert(sellerProfile);
  // 6. Validate response
  TestValidator.equals("seller id matches", sellerProfile.id, sellerAuth.id);
  TestValidator.equals("email matches", sellerProfile.email, sellerAuth.email);
  TestValidator.equals(
    "shop name matches",
    sellerProfile.shop_name,
    sellerAuth.shop_name,
  );
  TestValidator.equals(
    "approval status is approved",
    sellerProfile.approval_status,
    "approved",
  );
  TestValidator.equals("status is active", sellerProfile.status, "active");
  TestValidator.equals(
    "shop description is null",
    sellerProfile.shop_description,
    null,
  );
  TestValidator.equals("logo image is null", sellerProfile.logo_image, null);
  TestValidator.equals(
    "rejection reason is null",
    sellerProfile.rejection_reason,
    null,
  );
  TestValidator.predicate("created_at is valid ISO 8601", () => {
    const date = new Date(sellerProfile.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid ISO 8601", () => {
    const date = new Date(sellerProfile.updated_at);
    return !isNaN(date.getTime());
  });
}
