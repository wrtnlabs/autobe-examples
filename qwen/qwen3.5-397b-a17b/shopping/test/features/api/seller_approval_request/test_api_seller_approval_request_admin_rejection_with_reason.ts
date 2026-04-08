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
 * Test administrator rejection of seller approval request with reason.
 *
 * Validates the complete seller approval rejection workflow including administrator authentication, seller registration, approval request submission, and administrative rejection with feedback. Ensures that rejected sellers receive transparent feedback about why their application was denied.
 *
 * The test verifies that the approval request status transitions correctly from 'pending' to 'rejected', the rejection reason is properly stored and returned, and the reviewing administrator's information is recorded in the approval request record.
 *
 * 1. Administrator account is created with random credentials and grade level.
 * 2. Seller account is created with random credentials (starts with pending approval status).
 * 3. Seller submits an approval request for administrator review.
 * 4. Administrator reviews and rejects the request with a specific rejection reason.
 * 5. Validates approval request status is 'rejected'.
 * 6. Validates rejectionReason matches the provided reason.
 * 7. Validates reviewedByAdmin contains the administrator's information.
 * 8. Validates seller's authorized response shows rejected status with reason.
 */
export async function test_api_seller_approval_request_admin_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create seller account (will have pending approval status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
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
  TestValidator.equals(
    "request seller matches",
    approvalRequest.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "request rejection reason null",
    approvalRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "request reviewed by admin null",
    approvalRequest.reviewedByAdmin,
    null,
  );
  // 4. Admin rejects the approval request with reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const updatedRequest =
    await api.functional.shoppingMall.admin.approval_requests.update(
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
  // 5. Verify status changed to rejected
  TestValidator.equals(
    "request status after rejection",
    updatedRequest.status,
    "rejected",
  );
  // 6. Verify rejection reason is populated
  TestValidator.equals(
    "rejection reason matches",
    updatedRequest.rejectionReason,
    rejectionReason,
  );
  // 7. Verify reviewedByAdmin is populated with admin info
  TestValidator.predicate(
    "reviewed by admin exists",
    updatedRequest.reviewedByAdmin !== null,
  );
  if (updatedRequest.reviewedByAdmin !== null) {
    TestValidator.equals(
      "reviewing admin email",
      updatedRequest.reviewedByAdmin.email,
      adminAuth.email,
    );
  }
  // 8. Verify seller can see rejection reason when logging in
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerAfterRejection = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(sellerAfterRejection);
  TestValidator.equals(
    "seller status after rejection",
    sellerAfterRejection.approval_status,
    "rejected",
  );
  TestValidator.equals(
    "seller rejection reason visible",
    sellerAfterRejection.rejection_reason,
    rejectionReason,
  );
}
