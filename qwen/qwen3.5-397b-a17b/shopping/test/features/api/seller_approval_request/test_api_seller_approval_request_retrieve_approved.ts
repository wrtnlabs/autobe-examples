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
 * Test seller approval request retrieval after administrator approval.
 *
 * Validates the complete seller approval workflow including seller registration, administrator approval, and retrieval of the approved approval request. Ensures that approved sellers can verify their approval status and that the approval metadata is correctly populated.
 *
 * The test verifies that the approval request transitions from 'pending' to 'approved' status, the reviewing administrator information is recorded, and the seller's approval_status is updated to enable selling capabilities.
 *
 * 1. Seller registers account which creates approval request with 'pending' status.
 * 2. Administrator registers account for approval workflow.
 * 3. Administrator approves the seller approval request.
 * 4. Seller retrieves their approval request and validates approval status.
 * 5. Validates response contains approved status, reviewedByAdmin populated, rejectionReason null, and seller.approvalStatus equals 'approved'.
 */
export async function test_api_seller_approval_request_retrieve_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account (creates approval request with 'pending' status)
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
  // 2. Register administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 3. Admin approves the seller approval request
  // Note: Using seller ID as the approval request ID (implementation-specific)
  const approvalRequest =
    await api.functional.shoppingMall.admin.approval_requests.update(
      adminConnection,
      {
        requestId: sellerAuth.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvalRequest);
  // 4. Seller retrieves their approval request
  const retrievedRequest =
    await api.functional.shoppingMall.seller.approval_requests.at(
      sellerConnection,
      {
        requestId: approvalRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate approval request details
  TestValidator.equals(
    "status is approved",
    retrievedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewedByAdmin is populated",
    retrievedRequest.reviewedByAdmin !== null,
  );
  TestValidator.equals(
    "rejectionReason is null",
    retrievedRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "seller approvalStatus is approved",
    retrievedRequest.seller.approvalStatus,
    "approved",
  );
  TestValidator.predicate(
    "updatedAt reflects approval",
    new Date(retrievedRequest.updatedAt) >=
      new Date(retrievedRequest.createdAt),
  );
}
