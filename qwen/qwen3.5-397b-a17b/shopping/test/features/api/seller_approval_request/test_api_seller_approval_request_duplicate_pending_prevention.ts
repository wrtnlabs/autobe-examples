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
 * Test duplicate pending seller approval request prevention.
 *
 * Validates the business rule that prevents sellers from having multiple pending approval requests simultaneously. This test ensures that when a seller attempts to submit a second approval request while their first request is still pending, the system rejects the duplicate request with a 409 Conflict error.
 *
 * The test workflow involves registering a new seller account, submitting an initial approval request, and then attempting to submit a second approval request. The system should reject the second request while preserving the original pending request.
 *
 * 1. Register a new seller account with randomized credentials.
 * 2. Submit the first approval request (should succeed with pending status).
 * 3. Validate the first request has status 'pending' and contains seller information.
 * 4. Attempt to submit a second approval request (should fail with 409 Conflict).
 * 5. Verify the error response indicates a pending request already exists.
 */
export async function test_api_seller_approval_request_duplicate_pending_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
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
  // Verify seller account was created with pending status
  TestValidator.equals(
    "seller approval status",
    sellerAuth.approval_status,
    "pending",
  );
  // 2. Submit the first approval request
  const firstRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(firstRequest);
  // 3. Validate the first request has pending status
  TestValidator.equals("first request status", firstRequest.status, "pending");
  TestValidator.equals(
    "first request seller id",
    firstRequest.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "first request rejection reason",
    firstRequest.rejectionReason,
    null,
  );
  // 4. Attempt to submit a second approval request (should fail with 409 Conflict)
  await TestValidator.httpError(
    "duplicate pending request rejected",
    409,
    async () => {
      await api.functional.shoppingMall.seller.approval_requests.create(
        sellerConnection,
      );
    },
  );
}
