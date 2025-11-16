import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

export async function test_api_shopping_mall_order_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer joins and authenticates
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://shoppingmall.example.com/register",
    referrer: "https://shoppingmall.example.com/home",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 2. Customer creates a new shopping mall order
  const orderCreateBody = {
    order_number: `ORD-${RandomGenerator.alphaNumeric(10)}`,
    status: "pending",
    payment_status: "pending",
    total_amount: Math.floor(Math.random() * 10000) + 100,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      { body: orderCreateBody },
    );
  typia.assert(order);
  TestValidator.equals(
    "created order matches requested order number",
    order.order_number,
    orderCreateBody.order_number,
  );
  TestValidator.equals(
    "created order status is pending",
    order.status,
    "pending",
  );

  // 3. Customer retrieves the order by orderId
  const orderRetrieved: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.at(
      connection,
      { orderId: order.id },
    );
  typia.assert(orderRetrieved);
  TestValidator.equals(
    "retrieved order id matches created order id",
    orderRetrieved.id,
    order.id,
  );
  TestValidator.equals(
    "retrieved order number matches",
    orderRetrieved.order_number,
    orderCreateBody.order_number,
  );
  TestValidator.equals(
    "retrieved order status matches",
    orderRetrieved.status,
    orderCreateBody.status,
  );
  TestValidator.equals(
    "retrieved payment status matches",
    orderRetrieved.payment_status,
    orderCreateBody.payment_status,
  );
  TestValidator.predicate(
    "total amount is non-negative",
    orderRetrieved.total_amount >= 0,
  );
}
