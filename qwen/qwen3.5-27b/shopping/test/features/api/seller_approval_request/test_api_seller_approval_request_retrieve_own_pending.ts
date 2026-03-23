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
 * Test seller retrieving their own pending approval request.
 *
 * 1. Register a new seller account
 * 2. Submit a seller approval request
 * 3. Retrieve the approval request using the request ID
 * 4. Validate the response contains correct pending status and seller information
 */
export async function test_api_seller_approval_request_retrieve_own_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(seller);
  // 2. Create a seller approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(approvalRequest);
  // 3. Retrieve the approval request using the request ID
  const retrievedRequest =
    await api.functional.shoppingMall.seller.seller_approval_requests.at(
      sellerConnection,
      {
        requestId: approvalRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 4. Validate the response
  TestValidator.equals(
    "request id matches",
    retrievedRequest.id,
    approvalRequest.id,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "responded_at is null",
    retrievedRequest.responded_at,
    null,
  );
  TestValidator.equals(
    "seller id matches",
    retrievedRequest.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedRequest.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "seller approval status is pending",
    retrievedRequest.seller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "seller status is active",
    retrievedRequest.seller.status,
    "active",
  );
  TestValidator.predicate(
    "reason is not empty",
    retrievedRequest.reason.length > 0,
  );
  TestValidator.predicate(
    "submitted_at is valid date-time",
    retrievedRequest.submitted_at !== null,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedRequest.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrievedRequest.updated_at !== null,
  );
  TestValidator.equals("deleted_at is null", retrievedRequest.deleted_at, null);
}
