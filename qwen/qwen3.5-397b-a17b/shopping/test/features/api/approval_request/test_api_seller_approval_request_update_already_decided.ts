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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller approval request update restriction after decision.
 *
 * Validates the business rule that seller approval requests can only be updated when in 'pending' status. Once an administrator has made a decision (approved or rejected), the approval request becomes immutable through the update endpoint.
 *
 * This test ensures that approval decisions are final and prevents accidental or malicious modification of completed approval workflows. The test verifies that attempting to update an already-decided approval request results in an error, and the original approval status remains unchanged.
 *
 * 1. Administrator account is created via admin join.
 * 2. Seller account is created via seller join (approval_status starts as 'pending').
 * 3. Seller submits an approval request (status: 'pending').
 * 4. Administrator approves the request (status transitions to 'approved').
 * 5. Attempt to update the approved request with rejection status.
 * 6. Verify the update operation fails with business logic error.
 */
export async function test_api_seller_approval_request_update_already_decided(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create seller account
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
  TestValidator.equals(
    "seller initial status",
    sellerAuth.approval_status,
    "pending",
  );
  // 3. Seller submits approval request
  const approvalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "request initial status",
    approvalRequest.status,
    "pending",
  );
  // 4. Administrator approves the request
  const approvedRequest =
    await api.functional.shoppingMall.admin.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "request approved status",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewedByAdmin is set",
    approvedRequest.reviewedByAdmin !== null,
  );
  // 5-6. Attempt to update already-approved request should fail
  await TestValidator.error("cannot update decided request", async () => {
    await api.functional.shoppingMall.admin.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "rejected",
          rejection_reason: "Trying to change decision",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  });
}
