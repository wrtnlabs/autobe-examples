import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller retrieving refund request details for their own product.
 *
 * Scenario:
 * 1. Seller registers and authenticates via join endpoint
 * 2. Create a refund request belonging to this seller (via order flow simulation)
 * 3. Call GET /seller/refund-requests/{requestId} with valid requestId
 * 4. Validate response returns complete refund request data including:
 *    - id, orderItem summary with product snapshot
 *    - customer info (id and email)
 *    - seller info, reason text
 *    - status (pending/approved/rejected)
 *    - seller_response_at timestamp
 *    - created_at, updated_at
 *    - refundRequestSnapshots array
 * 5. Validate response structure matches IEcommerceMallRefundRequest schema
 */
export async function test_api_refund_request_retrieval_by_owner_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Update connection with seller's authorization
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Generate a valid UUID for the refund request ID
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call GET /seller/refund-requests/{requestId}
  const refundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.at(
      sellerConnection,
      {
        requestId: requestId,
      },
    );
  // 4. Validate response with typia.assert()
  typia.assert(refundRequest);
  // 5. Validate business logic - seller should see their own refund request
  TestValidator.equals(
    "seller id matches",
    refundRequest.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "status is valid",
    typeof refundRequest.status,
    "string",
  );
  TestValidator.equals(
    "reason is string",
    typeof refundRequest.reason,
    "string",
  );
  TestValidator.predicate(
    "has timestamps",
    refundRequest.created_at !== undefined &&
      refundRequest.updated_at !== undefined,
  );
  TestValidator.predicate(
    "has orderItem",
    refundRequest.orderItem !== undefined &&
      refundRequest.orderItem.id !== undefined,
  );
  TestValidator.predicate(
    "has refundRequestSnapshots array",
    Array.isArray(refundRequest.refundRequestSnapshots),
  );
}
