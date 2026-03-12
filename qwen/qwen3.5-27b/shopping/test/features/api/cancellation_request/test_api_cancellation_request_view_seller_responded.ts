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
 * Test that a customer can retrieve a cancellation request after the seller has responded.
 *
 * This test validates the complete cancellation request workflow:
 * 1. Customer and seller registration/authentication
 * 2. Order creation with order items
 * 3. Cancellation request creation by customer
 * 4. Seller response (approve and reject scenarios)
 * 5. Customer viewing the responded cancellation request
 *
 * Verifies that seller responses are properly reflected in the cancellation request
 * including status changes, seller information, timestamps, and rejection reasons.
 */
export async function test_api_cancellation_request_view_seller_responded(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "password123",
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Create order with order items
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 4. Create cancellation request for the first order item
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.orderItems[0].id,
          reason: "Changed my mind about this purchase",
        },
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "initial status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "seller is null initially",
    cancellationRequest.seller,
    null,
  );
  TestValidator.equals(
    "respondedAt is null initially",
    cancellationRequest.respondedAt,
    null,
  );
  // 5. Seller approves the cancellation request
  const approvedRequest =
    await api.functional.shoppingMall.seller.cancellationRequests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 6. Customer views the approved cancellation request
  const viewedApprovedRequest =
    await api.functional.shoppingMall.customer.cancellationRequests.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(viewedApprovedRequest);
  // Validate approved cancellation request
  TestValidator.equals(
    "status is approved",
    viewedApprovedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "seller object is populated",
    viewedApprovedRequest.seller !== null,
  );
  if (viewedApprovedRequest.seller !== null) {
    TestValidator.equals(
      "seller id matches",
      viewedApprovedRequest.seller.id,
      sellerAuth.id,
    );
    TestValidator.equals(
      "seller shop name matches",
      viewedApprovedRequest.seller.shop_name,
      sellerAuth.shop_name,
    );
  }
  TestValidator.predicate(
    "respondedAt is set",
    viewedApprovedRequest.respondedAt !== null,
  );
  TestValidator.equals(
    "rejection reason is null for approved",
    viewedApprovedRequest.rejectionReason,
    null,
  );
  // Validate timestamps are in correct order
  if (viewedApprovedRequest.respondedAt !== null) {
    TestValidator.predicate(
      "respondedAt is after requestedAt",
      new Date(viewedApprovedRequest.respondedAt).getTime() >=
        new Date(viewedApprovedRequest.requestedAt).getTime(),
    );
    TestValidator.predicate(
      "respondedAt is after createdAt",
      new Date(viewedApprovedRequest.respondedAt).getTime() >=
        new Date(viewedApprovedRequest.createdAt).getTime(),
    );
  }
  // 7. Create another cancellation request for reject scenario
  const order2 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order2);
  TestValidator.predicate("order2 has items", order2.orderItems.length > 0);
  const cancellationRequest2 =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order2.orderItems[0].id,
          reason: "Found a better price elsewhere",
        },
      },
    );
  typia.assert(cancellationRequest2);
  // 8. Seller rejects the cancellation request with a reason
  const rejectedRequest =
    await api.functional.shoppingMall.seller.cancellationRequests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest2.id,
        body: {
          status: "rejected",
          rejection_reason: "Item has already been prepared for shipment",
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // 9. Customer views the rejected cancellation request
  const viewedRejectedRequest =
    await api.functional.shoppingMall.customer.cancellationRequests.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest2.id,
      },
    );
  typia.assert(viewedRejectedRequest);
  // Validate rejected cancellation request
  TestValidator.equals(
    "status is rejected",
    viewedRejectedRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "seller object is populated",
    viewedRejectedRequest.seller !== null,
  );
  if (viewedRejectedRequest.seller !== null) {
    TestValidator.equals(
      "seller id matches",
      viewedRejectedRequest.seller.id,
      sellerAuth.id,
    );
  }
  TestValidator.predicate(
    "respondedAt is set",
    viewedRejectedRequest.respondedAt !== null,
  );
  TestValidator.predicate(
    "rejection reason is provided",
    viewedRejectedRequest.rejectionReason !== null,
  );
  if (viewedRejectedRequest.rejectionReason !== null) {
    TestValidator.predicate(
      "rejection reason is not empty",
      viewedRejectedRequest.rejectionReason.length > 0,
    );
  }
  // Validate complete cancellation request object structure
  TestValidator.predicate("has id", viewedRejectedRequest.id !== undefined);
  TestValidator.predicate(
    "has orderItem",
    viewedRejectedRequest.orderItem !== undefined,
  );
  TestValidator.predicate(
    "has customer",
    viewedRejectedRequest.customer !== undefined,
  );
  TestValidator.predicate(
    "has reason",
    viewedRejectedRequest.reason !== undefined,
  );
  TestValidator.predicate(
    "has requestedAt",
    viewedRejectedRequest.requestedAt !== undefined,
  );
  TestValidator.predicate(
    "has createdAt",
    viewedRejectedRequest.createdAt !== undefined,
  );
  TestValidator.predicate(
    "has updatedAt",
    viewedRejectedRequest.updatedAt !== undefined,
  );
}
