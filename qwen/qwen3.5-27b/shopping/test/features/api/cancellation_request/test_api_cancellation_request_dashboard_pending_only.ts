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
 * Test the cancellation request dashboard when a seller has only pending cancellation requests.
 *
 * This test verifies that the seller dashboard correctly displays cancellation requests
 * that have not yet been responded to by the seller. It validates:
 * 1. Summary statistics show correct counts for pending requests
 * 2. Recent requests list contains all pending requests
 * 3. Each request has null values for seller response fields
 * 4. Customer and order item information is properly populated
 */
export async function test_api_cancellation_request_dashboard_pending_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Customer places an order (this creates order items)
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Verify order has at least one item
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 4. Customer submits multiple cancellation requests for order items
  const cancellationRequests: IShoppingMallCancellationRequest[] = [];
  const itemCount = Math.min(order.orderItems.length, 3); // Cancel up to 3 items
  for (let i = 0; i < itemCount; i++) {
    const request =
      await generate_random_shopping_mall_customer_cancellation_requests_create(
        customerConnection,
        {
          body: {
            orderItemId: order.orderItems[i].id,
            reason: `Customer wants to cancel item ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          },
        },
      );
    typia.assert(request);
    cancellationRequests.push(request);
  }
  // Verify all requests were created with pending status
  TestValidator.equals(
    "all requests are pending",
    cancellationRequests.every((req) => req.status === "pending"),
    true,
  );
  // 5. Seller accesses cancellation request dashboard
  const dashboard =
    await api.functional.shoppingMall.customer.cancellation_requests.dashboard(
      sellerConnection,
    );
  typia.assert(dashboard);
  // 6. Verify summary statistics
  TestValidator.equals(
    "pending count matches request count",
    dashboard.summary.pendingCount,
    itemCount,
  );
  TestValidator.equals(
    "approved count is zero",
    dashboard.summary.approvedCount,
    0,
  );
  TestValidator.equals(
    "rejected count is zero",
    dashboard.summary.rejectedCount,
    0,
  );
  TestValidator.equals(
    "total count equals pending count",
    dashboard.summary.totalCount,
    itemCount,
  );
  // 7. Verify recent requests array
  TestValidator.equals(
    "recent requests count matches",
    dashboard.recentRequests.length,
    itemCount,
  );
  // 8. Verify each request in recentRequests
  for (const request of dashboard.recentRequests) {
    // Status should be pending
    TestValidator.equals(
      `request ${request.id} status is pending`,
      request.status,
      "pending",
    );
    // respondedAt should be null (seller hasn't responded)
    TestValidator.equals(
      `request ${request.id} respondedAt is null`,
      request.respondedAt,
      null,
    );
    // rejectionReason should be null (no rejection for pending)
    TestValidator.equals(
      `request ${request.id} rejectionReason is null`,
      request.rejectionReason,
      null,
    );
    // seller should be null (seller hasn't responded yet)
    TestValidator.equals(
      `request ${request.id} seller is null`,
      request.seller,
      null,
    );
    // customer should be populated
    TestValidator.predicate(
      `request ${request.id} has customer info`,
      request.customer !== null && request.customer !== undefined,
    );
    // orderItem should be populated
    TestValidator.predicate(
      `request ${request.id} has order item info`,
      request.orderItem !== null && request.orderItem !== undefined,
    );
  }
}
