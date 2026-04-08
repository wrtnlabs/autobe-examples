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
 * Test seller retrieval of rejected approval request with rejection reason.
 *
 * Validates the complete approval request rejection workflow including seller registration, administrator review and rejection, and seller's ability to retrieve the rejection details. Ensures that rejected sellers can view the rejection reason provided by the administrator and that all audit fields are properly populated.
 *
 * The test verifies that the approval request status transitions correctly from 'pending' to 'rejected', that the reviewedByAdmin field is populated with the reviewing administrator's information, and that the rejectionReason contains the feedback provided by the administrator.
 *
 * 1. Seller registers account which creates approval request with 'pending' status.
 * 2. Administrator registers and logs in to review approval requests.
 * 3. Admin rejects the seller approval request with a rejection reason.
 * 4. Seller logs in and retrieves their approval request.
 * 5. Validates response contains rejected status, admin reviewer info, rejection reason, and updated timestamps.
 */
export async function test_api_seller_approval_request_retrieve_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for later login
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // 1. Register seller account (creates approval request with 'pending' status)
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  const sellerId = sellerJoinResult.id;
  const sellerEmail = sellerJoinResult.email;
  // 2. Register administrator account
  const adminJoinResult = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // 3. Admin logs in to get fresh session
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLoginResult = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLoginResult);
  adminConnection.headers = {
    Authorization: `Bearer ${adminLoginResult.token.access}`,
  };
  // Store the rejection reason for validation
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  // Admin rejects the seller approval request
  // The approval request ID is the seller's ID (1:1 relationship)
  const rejectedRequest =
    await api.functional.shoppingMall.admin.approval_requests.update(
      adminConnection,
      {
        requestId: sellerId,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // 4. Seller logs in to retrieve their approval request
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLoginResult);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerLoginResult.token.access}`,
  };
  // Seller retrieves their approval request
  const retrievedRequest =
    await api.functional.shoppingMall.seller.approval_requests.at(
      sellerConnection,
      {
        requestId: sellerId,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate the response
  TestValidator.equals(
    "status is rejected",
    retrievedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches",
    retrievedRequest.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewedByAdmin is populated",
    retrievedRequest.reviewedByAdmin !== null,
  );
  TestValidator.predicate(
    "updatedAt is after createdAt",
    new Date(retrievedRequest.updatedAt) > new Date(retrievedRequest.createdAt),
  );
  // Validate admin reviewer information
  if (retrievedRequest.reviewedByAdmin) {
    TestValidator.equals(
      "reviewer email matches admin",
      retrievedRequest.reviewedByAdmin.email,
      adminJoinResult.email,
    );
  }
}
