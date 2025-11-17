import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";

export async function test_api_shopping_mall_customer_refund_request_creation_with_valid_order(
  connection: api.IConnection,
) {
  // 1. Authenticate and register customer
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create a new order for the customer
  const orderBody = {
    order_number: `ORD-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    order_status: "pending",
    payment_status: "pending",
    total_amount: Number((Math.random() * 1000 + 10).toFixed(2)),
    shipping_address: `Customer address at signup time`,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 3. Create a refund request associated with the order
  const refundBody = {
    shopping_mall_order_id: order.id,
    refund_amount: order.total_amount * 0.5,
    refund_reason: `Refund requested for order ${order.order_number} due to product defect.`,
  } satisfies IShoppingMallRefundRequest.ICreate;

  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.customer.refundRequests.create(
      connection,
      {
        body: refundBody,
      },
    );
  typia.assert(refundRequest);

  // 4. Validate the refund request details
  TestValidator.equals(
    "refund request associated order ID matches",
    refundRequest.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "refund amount is as requested",
    refundRequest.refund_amount,
    refundBody.refund_amount,
  );
  TestValidator.equals(
    "refund reason is correct",
    refundRequest.refund_reason,
    refundBody.refund_reason,
  );
  TestValidator.equals(
    "refund status is pending",
    refundRequest.refund_status,
    "pending",
  );
}
