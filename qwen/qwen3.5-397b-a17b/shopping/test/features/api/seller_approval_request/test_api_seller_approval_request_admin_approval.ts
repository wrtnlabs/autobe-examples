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
 * Test administrator approval of a pending seller approval request.
 *
 * Validates the complete seller approval workflow including administrator authentication, seller registration, approval request submission, and administrator approval decision. Ensures that the approval request status transitions correctly from 'pending' to 'approved' and that the seller's account reflects the approved status.
 *
 * The test verifies that the reviewedByAdmin field is populated with the reviewing administrator's information, the rejectionReason remains null for approved requests, and the updatedAt timestamp is properly updated upon approval.
 *
 * 1. Administrator account is created and authenticated.
 * 2. Seller account is created with pending approval status.
 * 3. Seller submits an approval request for administrator review.
 * 4. Administrator updates the approval request with 'approved' status.
 * 5. Validates approval request status changed from 'pending' to 'approved'.
 * 6. Validates reviewedByAdmin is populated with admin information.
 * 7. Validates rejectionReason is null for approved request.
 * 8. Validates updatedAt timestamp was updated.
 */
export async function test_api_seller_approval_request_admin_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Create seller account (starts with pending status)
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller initial status",
    sellerAuth.approval_status,
    "pending",
  );
  // 3. Seller submits approval request
  const approvalRequestConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${sellerAuth.token.access}` },
  };
  const approvalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      approvalRequestConnection,
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "request initial status",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "request seller id",
    approvalRequest.seller.id,
    sellerAuth.id,
  );
  TestValidator.predicate(
    "reviewedByAdmin is null when pending",
    approvalRequest.reviewedByAdmin === null,
  );
  TestValidator.equals(
    "rejectionReason is null when pending",
    approvalRequest.rejectionReason,
    null,
  );
  // 4. Administrator approves the request
  const approvedRequest =
    await api.functional.shoppingMall.admin.approval_requests.update(
      adminLoginConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Verify approval request status changed to approved
  TestValidator.equals(
    "request status after approval",
    approvedRequest.status,
    "approved",
  );
  TestValidator.notEquals(
    "updatedAt was updated",
    approvalRequest.updatedAt,
    approvedRequest.updatedAt,
  );
  // 6. Verify reviewedByAdmin is populated
  TestValidator.predicate(
    "reviewedByAdmin is populated",
    approvedRequest.reviewedByAdmin !== null,
  );
  if (approvedRequest.reviewedByAdmin !== null) {
    TestValidator.equals(
      "reviewing admin id",
      approvedRequest.reviewedByAdmin.id,
      adminAuth.id,
    );
  }
  // 7. Verify rejectionReason remains null for approved requests
  TestValidator.equals(
    "rejectionReason is null for approved",
    approvedRequest.rejectionReason,
    null,
  );
  // 8. Seller login should now succeed (approved sellers can login)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerAuth.email,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(sellerLoginResult);
  TestValidator.equals(
    "seller status after approval",
    sellerLoginResult.approval_status,
    "approved",
  );
}
