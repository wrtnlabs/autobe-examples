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
 * Test seller approval request initial submission for newly registered seller.
 *
 * Validates the complete workflow where a newly registered seller submits their first approval request for administrator review. This test ensures that sellers can immediately submit approval requests after registration and that the request is properly initialized with pending status.
 *
 * The test verifies that the approval request contains all required fields with correct initial values: status is 'pending', rejection_reason is null, reviewedByAdmin is null, and audit timestamps are properly set. It also validates that the seller relation correctly references the authenticated seller account.
 *
 * 1. Register new seller account with randomized credentials via authorize_seller_join utility.
 * 2. Submit first approval request using the authenticated seller connection.
 * 3. Validate approval request response structure and initial field values.
 * 4. Verify seller information is correctly embedded in the approval request.
 * 5. Confirm timestamps are initialized and createdAt equals updatedAt for new records.
 */
export async function test_api_seller_approval_request_initial_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller account
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
  // Verify seller was created with pending status
  TestValidator.equals(
    "seller approval status",
    sellerAuth.approval_status,
    "pending",
  );
  // 2. Submit first approval request
  const approvalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  // 3. Validate approval request structure and initial values
  TestValidator.equals("status is pending", approvalRequest.status, "pending");
  TestValidator.equals(
    "rejection reason is null",
    approvalRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "reviewed by admin is null",
    approvalRequest.reviewedByAdmin,
    null,
  );
  TestValidator.equals("deleted at is null", approvalRequest.deletedAt, null);
  // 4. Verify seller relation contains correct information
  TestValidator.equals(
    "seller id matches",
    approvalRequest.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller email matches",
    approvalRequest.seller.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "seller approval status",
    approvalRequest.seller.approvalStatus,
    "pending",
  );
  TestValidator.equals(
    "seller rejection reason is null",
    approvalRequest.seller.rejectionReason,
    null,
  );
  // 5. Validate timestamps are properly initialized
  TestValidator.equals(
    "createdAt equals updatedAt for new record",
    approvalRequest.createdAt,
    approvalRequest.updatedAt,
  );
  // Verify timestamps are recent (within last minute)
  const now = new Date();
  const createdAt = new Date(approvalRequest.createdAt);
  const timeDiff = now.getTime() - createdAt.getTime();
  TestValidator.predicate(
    "createdAt is recent",
    timeDiff >= 0 && timeDiff < 60000,
  );
}
