import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
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

/**
 * Test that an administrator can reject a pending seller registration approval request.
 *
 * Validates the complete administrator rejection workflow for seller registration requests. Ensures that the rejection reason is correctly stored and returned, the reviewer identity is populated on the request record, and the reviewed_at timestamp is assigned upon review.
 *
 * 1. Administrator creates an account via `authorize_administrator_join`.
 * 2. Seller creates an account via `authorize_seller_join`.
 * 3. Seller submits a registration approval request via the approval requests API, creating a pending record.
 * 4. Administrator rejects the request with a specific textual rejection reason.
 * 5. Validates the rejected request response: status is "rejected", rejection_reason matches the input, reviewer is populated, and reviewed_at is set.
 */
export async function test_api_seller_registration_approval_reject(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // Step 2: Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Step 3: Seller submits an approval request
  const approvalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "request status is pending",
    approvalRequest.status,
    "pending",
  );
  // Step 4: Administrator rejects the approval request
  const rejectionReason =
    "Your business documentation does not meet our platform requirements. Please provide valid business registration documents and resubmit.";
  const rejectedRequest =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "rejected" as const,
          rejection_reason: rejectionReason,
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // Step 5: Validate the rejected request response
  TestValidator.equals(
    "status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches input",
    rejectedRequest.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewer is populated",
    rejectedRequest.reviewer !== null,
  );
  TestValidator.predicate(
    "reviewer has id",
    typeof rejectedRequest.reviewer!.id === "string",
  );
  TestValidator.predicate(
    "reviewed_at is set",
    rejectedRequest.reviewed_at !== null,
  );
}
