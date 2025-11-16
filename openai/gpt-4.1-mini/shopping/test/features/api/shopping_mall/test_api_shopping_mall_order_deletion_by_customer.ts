import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

export async function test_api_shopping_mall_order_deletion_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer by calling POST /auth/customer/join
  const customerBody = {
    email: `test.user.${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongPassword123!",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/signup",
    referrer: "https://search.example.com",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBody,
    });
  typia.assert(customer);

  // 2. Create a new shopping mall order by calling POST /shoppingMall/customer/shoppingMallOrders
  const orderBody = {
    order_number: `ORDER-${Date.now()}${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
    status: "pending",
    payment_status: "pending",
    total_amount: 10000,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      {
        body: orderBody,
      },
    );
  typia.assert(order);

  // Validate order id matches
  TestValidator.predicate(
    "order id is defined",
    typeof order.id === "string" && order.id.length > 0,
  );
  // Validate order number matches
  TestValidator.equals(
    "order number matches",
    order.order_number,
    orderBody.order_number,
  );

  // 3. Delete created order by calling DELETE /shoppingMall/customer/shoppingMallOrders/{orderId}
  await api.functional.shoppingMall.customer.shoppingMallOrders.erase(
    connection,
    {
      orderId: order.id,
    },
  );

  // Optional: Attempt retrieving deleted order expecting error - no GET endpoint given so skipping
}
