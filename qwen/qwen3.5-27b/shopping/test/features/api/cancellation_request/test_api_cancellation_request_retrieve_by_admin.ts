import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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
 * Test that an authenticated administrator can retrieve detailed information about a specific cancellation request by its unique identifier.
 *
 * This test validates the admin cancellation request retrieval endpoint by:
 * 1. Setting up admin, customer, and seller accounts
 * 2. Creating an order as the customer
 * 3. Creating a cancellation request for an order item
 * 4. Retrieving the cancellation request as admin
 * 5. Validating all response fields are properly populated
 */
export async function test_api_cancellation_request_retrieve_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Seller setup (needed for order creation)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Customer creates an order
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Validate order has items
  TestValidator.predicate(
    "order has at least one item",
    order.orderItems.length > 0,
  );
  // 5. Customer creates a cancellation request for the first order item
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.orderItems[0].id,
          reason: "Customer changed mind about purchase",
        },
      },
    );
  typia.assert(cancellationRequest);
  // 6. Admin retrieves the cancellation request by ID
  const retrievedRequest =
    await api.functional.shoppingMall.admin.cancellationRequests.at(
      adminConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 7. Validate response fields
  TestValidator.equals(
    "cancellation request ID matches",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "order item ID matches",
    retrievedRequest.orderItem.id,
    order.orderItems[0].id,
  );
  TestValidator.equals(
    "customer ID matches",
    retrievedRequest.customer.id,
    cancellationRequest.customer.id,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "seller is null for pending request",
    retrievedRequest.seller,
    null,
  );
  TestValidator.equals(
    "rejection reason is null for pending request",
    retrievedRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "responded at is null for pending request",
    retrievedRequest.respondedAt,
    null,
  );
  TestValidator.equals(
    "reason matches original",
    retrievedRequest.reason,
    "Customer changed mind about purchase",
  );
  TestValidator.predicate(
    "requested at is valid date-time",
    retrievedRequest.requestedAt !== null &&
      retrievedRequest.requestedAt !== undefined,
  );
  TestValidator.predicate(
    "created at is valid date-time",
    retrievedRequest.createdAt !== null &&
      retrievedRequest.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated at is valid date-time",
    retrievedRequest.updatedAt !== null &&
      retrievedRequest.updatedAt !== undefined,
  );
  TestValidator.equals(
    "deleted at is null for active request",
    retrievedRequest.deletedAt,
    null,
  );
}
