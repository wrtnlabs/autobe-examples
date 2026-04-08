import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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

/**
 * Test seller approval request resubmission after rejection workflow.
 *
 * Validates the complete resubmission flow where a previously rejected seller can submit a new approval request. Ensures that the new request properly resets the status to 'pending', clears the rejection reason, and creates a fresh approval request record for administrator review.
 *
 * The test verifies that rejected sellers retain the ability to reapply, which is critical for platform inclusivity and allowing sellers to address feedback from previous rejections. The workflow confirms that each new submission is treated as a fresh request independent of prior rejection history.
 *
 * 1. Register a new seller account with randomized credentials.
 * 2. Seller submits approval request (simulating resubmission after rejection scenario).
 * 3. Verify approval request response contains status 'pending'.
 * 4. Verify rejectionReason is null for the new submission.
 * 5. Verify seller relation contains correct email and approval status.
 * 6. Verify reviewedByAdmin is null awaiting administrator review.
 * 7. Verify createdAt timestamp is properly set.
 */
export async function test_api_seller_approval_request_resubmission_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
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
  // 2. Verify seller was created with pending status
  TestValidator.equals(
    "seller approval status is pending",
    sellerAuth.approval_status,
    "pending",
  );
  TestValidator.equals(
    "seller has no rejection reason initially",
    sellerAuth.rejection_reason,
    undefined,
  );
  // 3. Submit a new seller approval request (simulating resubmission after rejection)
  const approvalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  // 4. Validate approval request status is pending
  TestValidator.equals(
    "approval request status is pending",
    approvalRequest.status,
    "pending",
  );
  // 5. Validate rejection reason is null for new submission
  TestValidator.equals(
    "rejection reason is null for new submission",
    approvalRequest.rejectionReason,
    null,
  );
  // 6. Validate seller relation contains correct information
  TestValidator.equals(
    "seller email matches authenticated seller",
    approvalRequest.seller.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "seller approval status in relation is pending",
    approvalRequest.seller.approvalStatus,
    "pending",
  );
  // 7. Validate reviewedByAdmin is null (awaiting review)
  TestValidator.equals(
    "reviewedByAdmin is null awaiting review",
    approvalRequest.reviewedByAdmin,
    null,
  );
  // 8. Validate createdAt timestamp is set and valid
  TestValidator.predicate(
    "createdAt timestamp is valid date-time",
    () => !isNaN(new Date(approvalRequest.createdAt).getTime()),
  );
  // 9. Validate seller ID is correctly associated
  TestValidator.equals(
    "seller ID in request matches authenticated seller",
    approvalRequest.seller.id,
    sellerAuth.id,
  );
}
