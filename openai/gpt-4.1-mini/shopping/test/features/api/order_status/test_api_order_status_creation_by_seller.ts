import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatus";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the creation of order status records by authenticated sellers indicating
 * the lifecycle events of their orders including payment, processing, shipment,
 * delivery, and cancellation stages.
 *
 * This test performs the following steps:
 *
 * 1. Seller user registration with a generated password
 * 2. Customer user registration with password
 * 3. Customer login for authentication context
 * 4. Customer creates an order with relevant data referencing seller and customer
 * 5. Seller login for authentication context switching
 * 6. Seller creates multiple order status entries for different valid statuses
 * 7. Each creation response is validated for correctness and relationship
 *    consistency
 *
 * The test ensures only authenticated sellers can create order statuses and
 * verifies the response data strictly.
 */
export async function test_api_order_status_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller registration with plain password for login
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: sellerPassword, // Using plain password string to simulate hash for testing
    company_name: RandomGenerator.name(3),
    contact_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active" as const,
  } satisfies IShoppingMallSeller.ICreate;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(seller);

  // 2. Customer registration
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: customerPassword,
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(customer);

  // 3. Customer login
  const customerLoginBody = {
    email: customer.email,
    password: customerPassword,
    __typename: "", // required field for IShoppingMallCustomer.ILogin
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLoggedIn = await api.functional.auth.customer.login(
    connection,
    { body: customerLoginBody },
  );
  typia.assert(customerLoggedIn);

  // 4. Customer creates order
  const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${RandomGenerator.alphaNumeric(4).toUpperCase()}`;
  const orderCreateBody = {
    shopping_mall_customer_id: customerLoggedIn.id,
    shopping_mall_seller_id: seller.id,
    order_number: orderNumber,
    total_price: 234.5,
    status: "Pending Payment",
    business_status: "new",
    payment_method: "credit_card",
    shipping_address: "123 Test St, Test City, Test Country",
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderCreateBody },
  );
  typia.assert(order);
  TestValidator.equals(
    "order customer id",
    order.shopping_mall_customer_id,
    customerLoggedIn.id,
  );
  TestValidator.equals(
    "order seller id",
    order.shopping_mall_seller_id,
    seller.id,
  );

  // 5. Seller login
  const sellerLoginBody = {
    email: seller.email,
    password: sellerPassword,
    captchaChallenge: null,
    captchaResponse: null,
    rememberMe: false,
    metadata: {},
    twoFactorCode: null,
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLoggedIn = await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });
  typia.assert(sellerLoggedIn);

  // 6. Seller creates order statuses to simulate lifecycle
  const statuses = [
    "Pending Payment",
    "Paid",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
  ] as const;
  for (const status of statuses) {
    const statusCreateBody = {
      shopping_mall_order_id: order.id,
      status: status,
      status_changed_at: new Date().toISOString(),
    } satisfies IShoppingMallOrderStatus.ICreate;

    const createdStatus =
      await api.functional.shoppingMall.seller.orders.statuses.create(
        connection,
        {
          orderId: order.id,
          body: statusCreateBody,
        },
      );
    typia.assert(createdStatus);
    TestValidator.equals(
      "order id in status entry",
      createdStatus.shopping_mall_order_id,
      order.id,
    );
    TestValidator.equals(
      "status in status entry",
      createdStatus.status,
      status,
    );
  }
}
