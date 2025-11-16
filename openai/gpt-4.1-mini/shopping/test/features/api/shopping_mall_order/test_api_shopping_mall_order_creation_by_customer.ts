import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

/**
 * Verify the process of creating a new shopping mall order by an authenticated
 * customer.
 *
 * This test executes the full workflow of:
 *
 * 1. Customer registration and authentication using the /auth/customer/join
 *    endpoint, receiving authorization tokens and user profile.
 * 2. Creation of a new shopping order using
 *    /shoppingMall/customer/shoppingMallOrders, providing all required fields
 *    for order creation.
 * 3. Verification that the server responds with a complete order entity, including
 *    input data and system-generated fields like order ID and timestamps.
 *
 * This ensures that the system correctly enforces authentication, accepts valid
 * order creation requests, and stores new orders with proper business rules.
 * The test also validates the returned order data matches the request.
 *
 * Test covers successful order creation by customer actor in the shopping mall
 * system.
 *
 * @param connection - The active API connection context
 */
export async function test_api_shopping_mall_order_creation_by_customer(
  connection: api.IConnection,
) {
  // Step 1. Register and authenticate a new customer, receive authorization token
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://test.shoppingmall.example.com/signup",
    referrer: "https://test.shoppingmall.example.com/landing",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(authorizedCustomer);

  // Step 2. Using authenticated context, create a new shopping mall order
  const orderNumber = `ORD-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const orderCreateBody = {
    order_number: orderNumber,
    status: "pending",
    payment_status: "pending",
    total_amount: 10000,
  } satisfies IShoppingMallOrder.ICreate;

  const createdOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      { body: orderCreateBody },
    );
  typia.assert(createdOrder);

  // Step 3. Validate the created order response fields
  TestValidator.equals(
    "order_number matches",
    createdOrder.order_number,
    orderCreateBody.order_number,
  );
  TestValidator.equals("status is 'pending'", createdOrder.status, "pending");
  TestValidator.equals(
    "payment_status is 'pending'",
    createdOrder.payment_status,
    "pending",
  );
  TestValidator.equals(
    "total_amount is 10000",
    createdOrder.total_amount,
    orderCreateBody.total_amount,
  );

  TestValidator.predicate(
    "id is a non-empty string",
    typeof createdOrder.id === "string" && createdOrder.id.length > 0,
  );
  TestValidator.predicate(
    "customer id is non-empty string",
    typeof createdOrder.shopping_mall_customer_id === "string" &&
      createdOrder.shopping_mall_customer_id.length > 0,
  );

  // typia.assert already validates date-time format correctness, no need for manual date parsing
  // These predicates simply validate presence and string nature
  TestValidator.predicate(
    "created_at is a string",
    typeof createdOrder.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is a string",
    typeof createdOrder.updated_at === "string",
  );
}
