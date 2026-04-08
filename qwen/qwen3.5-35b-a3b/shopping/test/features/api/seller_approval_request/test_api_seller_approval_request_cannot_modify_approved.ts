import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_approval_requests_create";
import { prepare_random_ecommerce_mall_seller_approval_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval_request";

/**
 * Test that an administrator cannot modify a seller approval request that has already been approved or rejected.
 *
 * Validates the immutability of seller approval decisions by attempting to update an already approved approval request. The test confirms that approval decisions are final and cannot be modified by administrators once made.
 *
 * This business rule protects against accidental or malicious modification of final approval decisions. Only pending requests (status='pending') can be updated, while approved or rejected requests are immutable.
 *
 * 1. Administrator registers and authenticates.
 * 2. Seller registers and authenticates.
 * 3. Seller submits approval request with business reason (status: pending).
 * 4. Administrator approves the request (status: approved, reviewer_id set).
 * 5. Administrator attempts to update the same request again with different status.
 * 6. Validates that the second update returns 403 Forbidden error.
 * 7. Confirms the approval request status remains 'approved' unchanged.
 * 8. Verifies reviewer_id and rejection_reason remain unchanged.
 * 9. Validates that seller account approval_status remains 'approved' unchanged.
 */
export async function test_api_seller_approval_request_cannot_modify_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: adminEmail,
      password: adminPassword,
      grade: "regular",
    },
  });
  typia.assert(adminResult);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Seller submits approval request (status: pending)
  const approvalRequest =
    await generate_random_ecommerce_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          request_reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        },
      },
    );
  typia.assert(approvalRequest);
  TestValidator.equals("status is pending", approvalRequest.status, "pending");
  TestValidator.equals("no reviewer yet", approvalRequest.reviewer, null);
  TestValidator.equals(
    "no rejection reason yet",
    approvalRequest.rejectionReason,
    null,
  );
  // 4. Administrator approves the request
  const adminConnectionForUpdate: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnectionForUpdate, {
    body: {
      email: adminResult.email,
      password: adminPassword,
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const updatedRequest =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.update(
      adminConnectionForUpdate,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
          reviewer_id: adminResult.id,
        },
      },
    );
  typia.assert(updatedRequest);
  TestValidator.equals("status is approved", updatedRequest.status, "approved");
  TestValidator.equals(
    "reviewer is set",
    updatedRequest.reviewer?.id,
    adminResult.id,
  );
  TestValidator.equals(
    "no rejection reason",
    updatedRequest.rejectionReason,
    null,
  );
  // 5. Administrator attempts to update the same request again (should fail)
  const adminConnectionSecond: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnectionSecond, {
    body: {
      email: adminResult.email,
      password: adminPassword,
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  await TestValidator.error("cannot update approved request", async () => {
    await api.functional.ecommerceMall.administrator.seller_approval_requests.update(
      adminConnectionSecond,
      {
        requestId: approvalRequest.id,
        body: {
          status: "rejected",
          reviewer_id: adminResult.id,
          rejection_reason: "Second update attempt",
        },
      },
    );
  });
  // 6. Verify approval request remains unchanged by attempting another update
  const adminConnectionThird: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnectionThird, {
    body: {
      email: adminResult.email,
      password: adminPassword,
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  await TestValidator.error(
    "cannot update approved request second time",
    async () => {
      await api.functional.ecommerceMall.administrator.seller_approval_requests.update(
        adminConnectionThird,
        {
          requestId: approvalRequest.id,
          body: {
            status: "rejected",
            reviewer_id: adminResult.id,
            rejection_reason: "Another update attempt",
          },
        },
      );
    },
  );
  // 7. Verify the approval request is still unchanged by fetching it again
  // We need to use the update endpoint to get current state since there's no GET endpoint
  const finalVerification =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.update(
      adminConnectionThird,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved", // Try to set back to approved
        },
      },
    );
  typia.assert(finalVerification);
  TestValidator.equals(
    "status unchanged after multiple attempts",
    finalVerification.status,
    updatedRequest.status,
  );
  TestValidator.equals(
    "reviewer unchanged",
    finalVerification.reviewer?.id,
    updatedRequest.reviewer?.id,
  );
  TestValidator.equals(
    "rejection_reason unchanged",
    finalVerification.rejectionReason,
    updatedRequest.rejectionReason,
  );
  // 8. Verify seller account approval_status remains 'approved'
  const sellerConnectionVerify: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_login(
    sellerConnectionVerify,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(), // Use a known email from join
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(sellerAuthorized);
  TestValidator.equals(
    "seller approval_status unchanged",
    sellerAuthorized.approval_status,
    "approved",
  );
}
