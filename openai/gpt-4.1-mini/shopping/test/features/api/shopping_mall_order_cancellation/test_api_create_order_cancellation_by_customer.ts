import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";

export async function test_api_create_order_cancellation_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer joins (signs up and authenticates)
  const customerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: "https://example.com/signup",
    referrer: "https://google.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create a shopping mall order
  // Construct an order_number of realistic format
  const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const orderBody = {
    order_number: orderNumber,
    order_status: "pending",
    payment_status: "pending",
    total_amount: Math.round(10000 + Math.random() * 90000),
    shipping_address: "123 Main Street, Seoul, South Korea",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 3. Create an order cancellation request
  const cancellationBody = {
    shopping_mall_order_id: order.id,
    cancellation_reason: "Changed my mind",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallOrderCancellation.ICreate;
  const cancellation: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.customer.orderCancellations.create(
      connection,
      {
        body: cancellationBody,
      },
    );
  typia.assert(cancellation);
}
