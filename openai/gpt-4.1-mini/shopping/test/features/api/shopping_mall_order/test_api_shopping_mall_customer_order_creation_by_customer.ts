import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

export async function test_api_shopping_mall_customer_order_creation_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Create a new authenticated customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: customerEmail,
    password: "TestPassword123!",
    href: "https://example.com/signup",
    referrer: "https://example.com/referrer",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(authorizedCustomer);

  // Step 2: Create a new shopping mall order
  const createOrderBody = {
    order_number: `ORDER-${RandomGenerator.alphaNumeric(10).toUpperCase()}`,
    order_status: "pending",
    payment_status: "pending",
    total_amount: 10000,
    shipping_address: JSON.stringify({
      name: "John Doe",
      address1: "123 Main Street",
      city: "Seoul",
      province: "Seoul",
      country: "South Korea",
      postal_code: "12345",
      phone: RandomGenerator.mobile(),
    }),
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: createOrderBody,
    });
  typia.assert(order);

  // Step 3: Validate returned order matches the request
  TestValidator.equals(
    "order_number",
    order.order_number,
    createOrderBody.order_number,
  );
  TestValidator.equals(
    "order_status",
    order.order_status,
    createOrderBody.order_status,
  );
  TestValidator.equals(
    "payment_status",
    order.payment_status,
    createOrderBody.payment_status,
  );
  TestValidator.equals(
    "total_amount",
    order.total_amount,
    createOrderBody.total_amount,
  );
  TestValidator.equals(
    "shipping_address",
    order.shipping_address,
    createOrderBody.shipping_address,
  );
}
