import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test the cancellation request dashboard when a seller has cancellation requests with different statuses.
 *
 * This test validates that the cancellation request dashboard correctly displays:
 * - Summary statistics (pending, approved, rejected counts)
 * - Recent requests ordered by submission date
 * - Request details including customer info, order item snapshots, and seller responses
 */
export async function test_api_cancellation_request_dashboard_with_mixed_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Customer places first order
  const order1 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order1);
  // 4. Customer places second order
  const order2 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order2);
  // 5. Customer places third order
  const order3 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order3);
  // Extract order items from each order
  const orderItemId1 = order1.orderItems[0].id;
  const orderItemId2 = order2.orderItems[0].id;
  const orderItemId3 = order3.orderItems[0].id;
  // 6. Customer submits first cancellation request
  const cancellationRequest1 =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId1,
          reason: "Changed my mind about the purchase",
        },
      },
    );
  typia.assert(cancellationRequest1);
  // 7. Customer submits second cancellation request
  const cancellationRequest2 =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId2,
          reason: "Found a better price elsewhere",
        },
      },
    );
  typia.assert(cancellationRequest2);
  // 8. Customer submits third cancellation request
  const cancellationRequest3 =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId3,
          reason: "Ordered by mistake",
        },
      },
    );
  typia.assert(cancellationRequest3);
  // 9. Seller approves the first cancellation request
  const updatedRequest1 =
    await api.functional.shoppingMall.seller.cancellationRequests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest1.id,
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(updatedRequest1);
  // 10. Seller rejects the second cancellation request
  const updatedRequest2 =
    await api.functional.shoppingMall.seller.cancellationRequests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest2.id,
        body: {
          status: "rejected",
          rejection_reason: "Item has already been prepared for shipment",
        },
      },
    );
  typia.assert(updatedRequest2);
  // 11. Leave the third request pending (no seller response)
  // 12. Seller calls the dashboard endpoint
  const dashboard =
    await api.functional.shoppingMall.customer.cancellation_requests.dashboard(
      sellerConnection,
    );
  typia.assert(dashboard);
  // 13. Verify summary statistics
  TestValidator.equals("pending count is 1", dashboard.summary.pendingCount, 1);
  TestValidator.equals(
    "approved count is 1",
    dashboard.summary.approvedCount,
    1,
  );
  TestValidator.equals(
    "rejected count is 1",
    dashboard.summary.rejectedCount,
    1,
  );
  TestValidator.equals("total count is 3", dashboard.summary.totalCount, 3);
  // 14. Verify recentRequests array contains 3 items
  TestValidator.predicate(
    "recent requests contains 3 items",
    dashboard.recentRequests.length === 3,
  );
  // 15. Verify requests are ordered by requested_at descending (newest first)
  TestValidator.predicate(
    "requests are ordered by requested_at descending",
    dashboard.recentRequests[0].requestedAt >=
      dashboard.recentRequests[1].requestedAt &&
      dashboard.recentRequests[1].requestedAt >=
        dashboard.recentRequests[2].requestedAt,
  );
  // 16. Find and verify the approved request
  const approvedRequest = dashboard.recentRequests.find(
    (req) => req.id === cancellationRequest1.id,
  );
  typia.assertGuard(approvedRequest!);
  TestValidator.equals(
    "approved request status",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "approved request has respondedAt",
    approvedRequest.respondedAt !== null,
  );
  TestValidator.equals(
    "approved request rejectionReason is null",
    approvedRequest.rejectionReason,
    null,
  );
  TestValidator.predicate(
    "approved request has seller info",
    approvedRequest.seller !== null,
  );
  // 17. Find and verify the rejected request
  const rejectedRequest = dashboard.recentRequests.find(
    (req) => req.id === cancellationRequest2.id,
  );
  typia.assertGuard(rejectedRequest!);
  TestValidator.equals(
    "rejected request status",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "rejected request has respondedAt",
    rejectedRequest.respondedAt !== null,
  );
  TestValidator.predicate(
    "rejected request has rejectionReason",
    rejectedRequest.rejectionReason !== null,
  );
  TestValidator.predicate(
    "rejected request has seller info",
    rejectedRequest.seller !== null,
  );
  // 18. Find and verify the pending request
  const pendingRequest = dashboard.recentRequests.find(
    (req) => req.id === cancellationRequest3.id,
  );
  typia.assertGuard(pendingRequest!);
  TestValidator.equals(
    "pending request status",
    pendingRequest.status,
    "pending",
  );
  TestValidator.equals(
    "pending request respondedAt is null",
    pendingRequest.respondedAt,
    null,
  );
  TestValidator.equals(
    "pending request rejectionReason is null",
    pendingRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "pending request seller is null",
    pendingRequest.seller,
    null,
  );
  // 19. Verify customer and orderItem info in requests
  TestValidator.predicate(
    "approved request has customer info",
    approvedRequest.customer.id !== undefined,
  );
  TestValidator.predicate(
    "approved request has orderItem info",
    approvedRequest.orderItem.id !== undefined,
  );
}
