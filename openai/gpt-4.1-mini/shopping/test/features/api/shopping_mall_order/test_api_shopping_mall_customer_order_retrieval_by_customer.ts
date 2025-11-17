import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

/**
 * Validate that a customer can sign up, create an order, and retrieve the order
 * details.
 *
 * This test covers:
 *
 * 1. Customer registration (/auth/customer/join).
 * 2. Order creation with required fields (/shoppingMall/customer/orders).
 * 3. Retrieval of the created order by its ID
 *    (/shoppingMall/customer/orders/{orderId}).
 *
 * Assertions verify returned data matches the input and response DTO schemas.
 */
export async function test_api_shopping_mall_customer_order_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer signs up
  const customerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreate,
    });
  typia.assert(authorizedCustomer);

  // 2. Create order
  const orderCreate = {
    order_number: `ORD-${RandomGenerator.alphaNumeric(8)}`,
    order_status: "pending",
    payment_status: "paid",
    total_amount: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<99999>
    >(),
    shipping_address: JSON.stringify({
      name: "John Doe",
      country: "South Korea",
      city: "Seoul",
      street: "123 Gangnam-daero",
      zip_code: "06134",
      phone: RandomGenerator.mobile(),
    }),
  } satisfies IShoppingMallOrder.ICreate;

  const createdOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreate,
    });
  typia.assert(createdOrder);

  // 3. Retrieve order details
  const retrievedOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.at(connection, {
      orderId: createdOrder.id,
    });
  typia.assert(retrievedOrder);

  // 4. Assertions
  TestValidator.equals("order id matches", retrievedOrder.id, createdOrder.id);
  TestValidator.equals(
    "order number matches",
    retrievedOrder.order_number,
    orderCreate.order_number,
  );
  TestValidator.equals(
    "order status matches",
    retrievedOrder.order_status,
    orderCreate.order_status,
  );
  TestValidator.equals(
    "payment status matches",
    retrievedOrder.payment_status,
    orderCreate.payment_status,
  );
  TestValidator.equals(
    "total amount matches",
    retrievedOrder.total_amount,
    orderCreate.total_amount,
  );
  TestValidator.equals(
    "shipping address matches",
    retrievedOrder.shipping_address,
    orderCreate.shipping_address,
  );
}
