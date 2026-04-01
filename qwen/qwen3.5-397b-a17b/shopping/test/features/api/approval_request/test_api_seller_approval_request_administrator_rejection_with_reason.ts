import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
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
import { generate_random_shopping_mall_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test the administrator rejection workflow for a pending seller approval request with required rejection reason.
 *
 * **Setup:**
 * 1. Administrator joins the platform (authentication via join)
 * 2. Seller joins the platform (authentication via join)
 * 3. Seller submits an approval request (creates pending request)
 *
 * **Test Execution:**
 * 1. Administrator calls PUT /shoppingMall/administrator/approval-requests/{requestId} with status='rejected' and rejection_reason='Does not meet platform seller requirements'
 * 2. Verify the response contains:
 *    - status changed to 'rejected'
 *    - reviewed_at timestamp is populated
 *    - reviewingAdministrator contains the administrator's information
 *    - rejection_reason contains the provided rejection text
 *
 * **Business Validation:**
 * - Verify the seller's approval_status is now 'rejected'
 * - Verify the rejection reason is visible to the seller when viewing their approval request
 * - Verify the seller can submit a new approval request after rejection (resubmission workflow)
 * - Verify rejection reason is non-empty and properly stored
 */
export async function test_api_seller_approval_request_administrator_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Seller setup - join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller submits approval request (creates pending request)
  const approvalRequest =
    await generate_random_shopping_mall_seller_approval_requests_create(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  // Verify initial state is pending
  TestValidator.equals(
    "initial approval status is pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "seller matches",
    approvalRequest.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "no reviewing administrator initially",
    approvalRequest.reviewingAdministrator,
    null,
  );
  // 4. Administrator rejects the approval request with reason
  const rejectionReason = "Does not meet platform seller requirements";
  const updatedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Verify rejection response
  TestValidator.equals(
    "status changed to rejected",
    updatedRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "reviewed_at is populated",
    updatedRequest.reviewed_at !== null &&
      updatedRequest.reviewed_at !== undefined,
  );
  TestValidator.predicate(
    "reviewingAdministrator is populated",
    updatedRequest.reviewingAdministrator !== null &&
      updatedRequest.reviewingAdministrator !== undefined,
  );
  TestValidator.equals(
    "reviewing administrator matches",
    updatedRequest.reviewingAdministrator!.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "rejection reason matches",
    updatedRequest.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "rejection reason is non-empty",
    updatedRequest.rejection_reason !== null &&
      updatedRequest.rejection_reason !== undefined &&
      updatedRequest.rejection_reason.length > 0,
  );
  // 6. Verify seller can view rejection reason
  TestValidator.equals(
    "rejection reason visible to seller",
    updatedRequest.rejection_reason,
    rejectionReason,
  );
  // 7. Verify seller can submit a new approval request after rejection (resubmission)
  const resubmittedRequest =
    await generate_random_shopping_mall_seller_approval_requests_create(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(resubmittedRequest);
  // Verify resubmitted request is in pending status
  TestValidator.equals(
    "resubmitted request is pending",
    resubmittedRequest.status,
    "pending",
  );
  TestValidator.equals(
    "resubmitted request seller matches",
    resubmittedRequest.seller.id,
    sellerAuth.id,
  );
  TestValidator.notEquals(
    "resubmitted request has different ID",
    resubmittedRequest.id,
    approvalRequest.id,
  );
}
