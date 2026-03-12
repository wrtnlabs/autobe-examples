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
 * Test that an administrator can retrieve detailed information about a rejected seller approval request with rejection reason.
 *
 * 1. Register a new seller account
 * 2. Submit a seller approval request
 * 3. Register an administrator
 * 4. Reject the seller approval request with a rejection reason
 * 5. Admin retrieves the rejected approval request
 * 6. Validate all response fields including status, timestamps, and seller information
 */
export async function test_api_seller_approval_request_retrieve_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Submit seller approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(approvalRequest);
  // 3. Register admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 4. Reject the seller approval request
  const updateBody = {
    status: "rejected" as const,
    rejection_reason: "Shop name does not meet platform guidelines",
  } satisfies IShoppingMallSellerApprovalRequest.IUpdate;
  const updatedRequest =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRequest);
  // 5. Admin retrieves the rejected approval request
  const retrievedRequest =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.at(
      adminConnection,
      {
        requestId: approvalRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Validate response fields
  TestValidator.equals(
    "request id matches",
    retrievedRequest.id,
    approvalRequest.id,
  );
  TestValidator.equals(
    "status is rejected",
    retrievedRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "responded_at is not null",
    retrievedRequest.responded_at !== null,
  );
  TestValidator.equals(
    "seller approval status is rejected",
    retrievedRequest.seller.approval_status,
    "rejected",
  );
  TestValidator.equals(
    "reason preserved",
    retrievedRequest.reason,
    approvalRequest.reason,
  );
  TestValidator.equals(
    "submitted_at preserved",
    retrievedRequest.submitted_at,
    approvalRequest.submitted_at,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedRequest.created_at !== null &&
      retrievedRequest.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrievedRequest.updated_at !== null &&
      retrievedRequest.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", retrievedRequest.deleted_at, null);
}
