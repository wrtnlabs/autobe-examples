import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApproval";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller approval status retrieval immediately after registration.
 *
 * Validates that a newly registered seller can view their approval status, which should be 'pending' indicating the account is awaiting administrator review. The test ensures the response includes all required fields and that rejection-related fields are null since the request has not been reviewed yet.
 *
 * This test covers the initial state of the seller approval workflow, ensuring that the system correctly tracks new seller registrations and provides appropriate status information to the seller.
 *
 * 1. Register a new seller account with randomized credentials using authorize_seller_join utility.
 * 2. Create a seller-specific connection with the returned authentication token.
 * 3. Call the approval status endpoint api.functional.ecommerce.seller.approval_status.at.
 * 4. Validate the response structure and type with typia.assert.
 * 5. Verify the approval status is 'pending'.
 * 6. Verify rejection_reason is null (not yet reviewed).
 * 7. Verify reviewedAt is null (not yet reviewed).
 * 8. Verify seller information is included in the response.
 * 9. Verify createdAt timestamp is present and valid.
 */
export async function test_api_seller_approval_status_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account with randomized credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // 2. Create seller-specific connection (already done above with sellerConnection)
  // sellerConnection now has the auth token in headers
  // 3. Call the approval status endpoint
  const approvalStatus =
    await api.functional.ecommerce.seller.approval_status.at(sellerConnection);
  typia.assert(approvalStatus);
  // 4. Validate the response structure and type with typia.assert (already done above)
  // 5. Verify the approval status is 'pending'
  TestValidator.equals(
    "approval status is pending",
    approvalStatus.status,
    "pending",
  );
  // 6. Verify rejection_reason is null (not yet reviewed)
  TestValidator.equals(
    "rejection reason is null for pending status",
    approvalStatus.rejectionReason,
    null,
  );
  // 7. Verify reviewedAt is null (not yet reviewed)
  TestValidator.equals(
    "reviewed at is null for pending status",
    approvalStatus.reviewedAt,
    null,
  );
  // 8. Verify seller information is included in the response
  TestValidator.predicate(
    "seller information is present",
    approvalStatus.seller !== null && approvalStatus.seller !== undefined,
  );
  TestValidator.equals(
    "seller ID matches authorized seller ID",
    approvalStatus.seller.id,
    sellerAuthorized.id,
  );
  // 9. Verify createdAt timestamp is present and valid
  TestValidator.predicate(
    "created at is present",
    approvalStatus.createdAt !== null && approvalStatus.createdAt !== undefined,
  );
  TestValidator.predicate(
    "created at is valid ISO datetime format",
    !isNaN(Date.parse(approvalStatus.createdAt)),
  );
}
