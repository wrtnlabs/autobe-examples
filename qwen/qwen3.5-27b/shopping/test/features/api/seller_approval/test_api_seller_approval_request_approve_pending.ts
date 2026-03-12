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
 * Test that an administrator can successfully approve a pending seller approval request.
 *
 * This test validates the complete seller approval workflow:
 * 1. Administrator authentication
 * 2. Seller registration and approval request submission
 * 3. Admin approval of the pending request
 * 4. Verification of status changes and timestamps
 */
export async function test_api_seller_approval_request_approve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com",
    },
  });
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      shop_name: "Test Shop",
      shop_description: "A test shop for e2e testing",
      href: "https://test.com/seller/join",
      referrer: "https://test.com",
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller submits approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: "I want to sell products on your platform",
        },
      },
    );
  typia.assert(approvalRequest);
  // Verify the request is in pending status
  TestValidator.equals(
    "approval request status is pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "responded_at is null for pending request",
    approvalRequest.responded_at === null,
  );
  // 4. Admin approves the pending request
  const updatedRequest =
    await api.functional.shoppingMall.admin.seller_approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(updatedRequest);
  // 5. Verify the approval was successful
  TestValidator.equals(
    "approval request status changed to approved",
    updatedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "responded_at is set after approval",
    updatedRequest.responded_at !== null,
  );
  TestValidator.equals(
    "seller in response matches original",
    updatedRequest.seller.id,
    approvalRequest.seller.id,
  );
  // 6. Verify seller's approval status was updated
  TestValidator.equals(
    "seller approval_status is approved",
    updatedRequest.seller.approval_status,
    "approved",
  );
}
