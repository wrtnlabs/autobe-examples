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
 * Test that an administrator can retrieve detailed information about a pending seller approval request.
 *
 * This test validates the complete workflow:
 * 1. Seller registration and approval request submission
 * 2. Administrator registration
 * 3. Administrator retrieval of pending seller approval request details
 * 4. Response structure and status validation
 */
export async function test_api_seller_approval_request_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Submit seller approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(approvalRequest);
  // 3. Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 4. Admin retrieves the pending approval request
  const retrievedRequest =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.at(
      adminConnection,
      {
        requestId: approvalRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate response structure and pending status
  TestValidator.equals(
    "request id matches",
    retrievedRequest.id,
    approvalRequest.id,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "responded_at is null",
    retrievedRequest.responded_at,
    null,
  );
  TestValidator.equals("deleted_at is null", retrievedRequest.deleted_at, null);
  TestValidator.predicate(
    "seller summary exists",
    retrievedRequest.seller !== null && retrievedRequest.seller !== undefined,
  );
  TestValidator.equals(
    "seller approval status is pending",
    retrievedRequest.seller.approval_status,
    "pending",
  );
  TestValidator.predicate(
    "has valid reason",
    retrievedRequest.reason.length > 0,
  );
  TestValidator.predicate(
    "has valid submitted_at timestamp",
    retrievedRequest.submitted_at !== null &&
      retrievedRequest.submitted_at !== undefined,
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    retrievedRequest.created_at !== null &&
      retrievedRequest.created_at !== undefined,
  );
  TestValidator.predicate(
    "has valid updated_at timestamp",
    retrievedRequest.updated_at !== null &&
      retrievedRequest.updated_at !== undefined,
  );
}
