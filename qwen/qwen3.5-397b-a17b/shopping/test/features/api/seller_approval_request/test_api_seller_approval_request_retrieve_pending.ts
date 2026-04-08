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
 * Test that a seller can successfully retrieve their own pending seller approval request.
 *
 * Validates the complete seller approval request retrieval workflow including seller registration which automatically creates a pending approval request, and subsequent retrieval of that request by the seller. Ensures that pending requests have the correct status, null review fields, and complete audit trail information.
 *
 * 1. Register a new seller account via /shoppingMall/auth/seller/join which automatically creates an approval request with 'pending' status.
 * 2. Create a seller-specific connection with the authentication token from registration.
 * 3. Retrieve the seller's approval request using the seller ID as the approval request ID.
 * 4. Validate the response contains status field equals 'pending', reviewedByAdmin field is null, rejectionReason field is null, seller field contains the seller's email and approvalStatus, createdAt and updatedAt timestamps are present, and id matches the requested approval request ID.
 *
 * Business Logic Validation:
 * - Sellers can access their own approval requests to check approval status
 * - Pending requests have null reviewedByAdmin and rejectionReason
 * - Response includes complete audit trail with timestamps
 */
export async function test_api_seller_approval_request_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account (creates pending approval request)
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  // 2. Create seller connection with auth token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerJoinResult.token.access}`,
    },
  };
  // 3. Retrieve the approval request
  const approvalRequest =
    await api.functional.shoppingMall.seller.approval_requests.at(
      sellerConnection,
      {
        requestId: sellerJoinResult.id,
      },
    );
  typia.assert(approvalRequest);
  // 4. Validate approval request status and fields
  TestValidator.equals("status is pending", approvalRequest.status, "pending");
  TestValidator.equals(
    "reviewedByAdmin is null",
    approvalRequest.reviewedByAdmin,
    null,
  );
  TestValidator.equals(
    "rejectionReason is null",
    approvalRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "request id matches",
    approvalRequest.id,
    sellerJoinResult.id,
  );
  TestValidator.equals(
    "seller email matches",
    approvalRequest.seller.email,
    sellerJoinResult.email,
  );
  TestValidator.equals(
    "seller approval status is pending",
    approvalRequest.seller.approvalStatus,
    "pending",
  );
  TestValidator.predicate(
    "createdAt exists",
    approvalRequest.createdAt !== null,
  );
  TestValidator.predicate(
    "updatedAt exists",
    approvalRequest.updatedAt !== null,
  );
}
