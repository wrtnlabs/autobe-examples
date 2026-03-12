import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
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
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test successful refund request creation for a delivered order item within the 7-day eligibility window.
 *
 * This test validates:
 * 1. Customer registration and authentication
 * 2. Order creation with items
 * 3. Refund request submission for an order item
 * 4. Response validation with all expected fields
 * 5. Refund request status is 'pending' after creation
 */
export async function test_api_refund_request_creation_success_within_window(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Create an order with items
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 3. Get the first order item to request refund for
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 4. Create refund request for the delivered order item
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 5. Validate refund request response
  TestValidator.equals(
    "refund request ID is UUID",
    typeof refundRequest.id,
    "string",
  );
  TestValidator.predicate(
    "refund request has reason",
    refundRequest.reason.length > 0,
  );
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "order item matches",
    refundRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "customer matches",
    refundRequest.customer.id,
    order.customer.id,
  );
  TestValidator.predicate(
    "requested at is valid date-time",
    refundRequest.requestedAt.length > 0,
  );
  TestValidator.predicate(
    "responded at is null for pending",
    refundRequest.respondedAt === null,
  );
  TestValidator.predicate(
    "created at is valid date-time",
    refundRequest.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated at is valid date-time",
    refundRequest.updatedAt.length > 0,
  );
}
