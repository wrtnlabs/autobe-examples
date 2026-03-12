import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test the primary success path where a newly registered seller submits their first approval request to join the platform.
 *
 * This test validates:
 * 1. New seller registration with valid credentials
 * 2. Submission of seller approval request with a valid reason
 * 3. Response contains complete approval request entity with correct status and timestamps
 * 4. Seller summary information is correctly included in the response
 */
export async function test_api_seller_approval_request_new_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection for authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Register new seller account (utility function handles authentication)
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Prepare approval request reason
  const reason = RandomGenerator.paragraph({ sentences: 5 });
  // 4. Submit seller approval request with valid reason
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason,
        } satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  // 5. Validate response business logic
  TestValidator.equals("status is pending", approvalRequest.status, "pending");
  TestValidator.equals(
    "seller id matches",
    approvalRequest.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller email matches",
    approvalRequest.seller.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "seller shop name matches",
    approvalRequest.seller.shop_name,
    sellerAuth.shop_name,
  );
  TestValidator.equals(
    "seller approval status is pending",
    approvalRequest.seller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "reason matches submitted",
    approvalRequest.reason,
    reason,
  );
  TestValidator.predicate(
    "reason is not empty",
    () => approvalRequest.reason.length > 0,
  );
  TestValidator.predicate("submitted_at is valid date-time", () => {
    const date = new Date(approvalRequest.submitted_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals(
    "responded_at is null",
    approvalRequest.responded_at,
    null,
  );
  TestValidator.equals("deleted_at is null", approvalRequest.deleted_at, null);
}
