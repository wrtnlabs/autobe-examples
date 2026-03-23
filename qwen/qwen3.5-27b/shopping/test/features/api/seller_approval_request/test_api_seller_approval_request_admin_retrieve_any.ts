import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test administrator retrieving any seller's approval request for review.
 *
 * This test validates that an administrator can access and retrieve details
 * of any seller's approval request, not just their own. The test creates a
 * seller account, submits an approval request, then authenticates as an
 * administrator to retrieve and verify the request details.
 */
export async function test_api_seller_approval_request_admin_retrieve_any(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller account and approval request
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  typia.assert(sellerAuthorized);
  // Create seller approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason:
            "I want to sell handmade crafts and unique products on your platform.",
        },
      },
    );
  typia.assert(approvalRequest);
  // 2. Setup: Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // 3. Execution: Admin retrieves the seller's approval request
  const retrievedRequest =
    await api.functional.shoppingMall.seller.seller_approval_requests.at(
      adminConnection,
      {
        requestId: approvalRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 4. Validation: Verify admin can access any seller's request
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    approvalRequest.id,
  );
  TestValidator.equals(
    "seller ID matches original request",
    retrievedRequest.seller.id,
    sellerAuthorized.id,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedRequest.seller.email,
    sellerAuthorized.email,
  );
  TestValidator.equals(
    "seller shop name matches",
    retrievedRequest.seller.shop_name,
    sellerAuthorized.shop_name,
  );
  TestValidator.equals(
    "reason is preserved",
    retrievedRequest.reason,
    approvalRequest.reason,
  );
  TestValidator.predicate(
    "status is pending",
    retrievedRequest.status === "pending",
  );
  TestValidator.predicate(
    "submitted_at is valid timestamp",
    retrievedRequest.submitted_at !== null &&
      retrievedRequest.submitted_at !== undefined,
  );
  TestValidator.predicate(
    "responded_at is null for pending request",
    retrievedRequest.responded_at === null,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    retrievedRequest.created_at !== null &&
      retrievedRequest.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    retrievedRequest.updated_at !== null &&
      retrievedRequest.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at is null for active request",
    retrievedRequest.deleted_at,
    null,
  );
}
