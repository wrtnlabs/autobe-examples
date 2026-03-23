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
 * Test that an authenticated administrator can retrieve a pending seller approval request by its unique identifier.
 *
 * Setup:
 * 1. Register and authenticate an administrator account
 * 2. Register and authenticate a seller account
 * 3. Submit a seller approval request
 * 4. Capture the approval request ID from the submission response
 *
 * Test Steps:
 * 1. Call GET /shoppingMall/admin/seller-approval-requests/{requestId} with the captured request ID
 * 2. Verify the response returns IShoppingMallSellerApprovalRequest structure
 * 3. Validate business logic:
 *    - id matches the requested request ID
 *    - seller object contains seller summary with approval_status='pending'
 *    - status is 'pending'
 *    - responded_at is null (since no admin decision yet)
 *    - deleted_at is null (request is active)
 *    - submitted_at, created_at, updated_at are valid timestamps
 */
export async function test_api_seller_approval_request_retrieve_pending_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Submit seller approval request to create a pending request
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(approvalRequest);
  // 4. Admin retrieves the pending seller approval request by ID
  const retrievedRequest =
    await api.functional.shoppingMall.admin.seller_approval_requests.getByRequestid(
      adminConnection,
      {
        requestId: approvalRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate business logic
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    approvalRequest.id,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "seller approval status is pending",
    retrievedRequest.seller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "responded_at is null for pending request",
    retrievedRequest.responded_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active request",
    retrievedRequest.deleted_at,
    null,
  );
  TestValidator.predicate(
    "submitted_at is valid timestamp",
    retrievedRequest.submitted_at != null &&
      retrievedRequest.submitted_at.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    retrievedRequest.created_at != null &&
      retrievedRequest.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    retrievedRequest.updated_at != null &&
      retrievedRequest.updated_at.length > 0,
  );
  TestValidator.equals(
    "seller ID matches",
    retrievedRequest.seller.id,
    approvalRequest.seller.id,
  );
  TestValidator.predicate(
    "reason is not empty",
    retrievedRequest.reason.length > 0,
  );
}
