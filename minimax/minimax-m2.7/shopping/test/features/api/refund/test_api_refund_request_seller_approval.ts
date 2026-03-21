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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller approving a customer refund request for a delivered order item.
 *
 * This test validates the seller approval workflow for refund requests where
 * the seller grants the customer's refund request, triggers refund processing,
 * and restores inventory.
 *
 * Prerequisites: A pending refund request must exist in the system for the seller.
 * This is typically created through a complete order-delivery-refund-request flow.
 *
 * Test Flow:
 * 1. Register and authenticate as a seller
 * 2. Retrieve pending refund requests to find one to approve
 * 3. Verify a pending refund request exists
 * 4. Approve the refund request via PUT /ecommerceMall/seller/refund-requests/{requestId}
 * 5. Validate the response body contains status = 'approved'
 * 6. Validate seller_response_at timestamp is populated
 * 7. Validate snapshot was created (via refundRequestSnapshots array)
 * 8. Validate business logic: order item status should change to 'refunded'
 */
export async function test_api_refund_request_seller_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Retrieve pending refund requests for this seller
  const pendingRequests =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // 3. Verify a pending refund request exists
  TestValidator.predicate(
    "should have at least one pending refund request",
    pendingRequests.data.length > 0,
  );
  // Get the first pending refund request
  const pendingRequest = pendingRequests.data[0];
  // 4. Approve the refund request
  const approvedRequest =
    await api.functional.ecommerceMall.seller.refund_requests.update(
      sellerConnection,
      {
        requestId: pendingRequest.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Validate response body contains status = 'approved'
  TestValidator.equals(
    "refund request status should be approved",
    approvedRequest.status,
    "approved",
  );
  // 6. Validate seller_response_at timestamp is populated
  TestValidator.predicate(
    "seller_response_at should be populated",
    approvedRequest.seller_response_at !== null &&
      approvedRequest.seller_response_at !== undefined,
  );
  // 7. Validate snapshot was created
  TestValidator.predicate(
    "should have at least one snapshot",
    approvedRequest.refundRequestSnapshots.length > 0,
  );
  // Validate snapshot content
  const snapshot = approvedRequest.refundRequestSnapshots[0];
  TestValidator.equals(
    "snapshot should contain original reason",
    snapshot.snapshot_reason,
    pendingRequest.reason,
  );
  TestValidator.equals(
    "snapshot status should be approved",
    snapshot.snapshot_status,
    "approved",
  );
  TestValidator.equals(
    "seller response should be approved",
    snapshot.seller_response,
    "approved",
  );
  TestValidator.equals(
    "seller response reason should be null for approval",
    snapshot.seller_response_reason,
    null,
  );
  // 8. Validate business logic: order item status should change to 'refunded'
  TestValidator.equals(
    "order item status should be refunded",
    approvedRequest.orderItem.status,
    "refunded",
  );
}
