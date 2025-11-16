import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_shopping_mall_seller_order_cancellation_creation(
  connection: api.IConnection,
) {
  // 1. Seller registration (join)
  const sellerCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@seller.com`,
    password: "SellerPassword123!",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 2. Seller login to ensure session and header auth
  const sellerLoginBody = {
    email: sellerCreateBody.email,
    password: sellerCreateBody.password,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://example.com/",
  } satisfies IShoppingMallSeller.ILogin;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 3. Customer registration (join)
  const customerCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@customer.com`,
    password: "CustomerPassword123!",
    full_name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/signup",
    referrer: "https://example.com/",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 4. Customer login
  const customerLoginBody = {
    email: customerCreateBody.email,
    password: customerCreateBody.password,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://example.com/",
  } satisfies IShoppingMallCustomer.ILogin;

  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 5. Create a shopping mall order as customer
  const orderCreateBody = {
    order_number: `ORD-${RandomGenerator.alphaNumeric(10)}`,
    status: "pending",
    payment_status: "pending",
    total_amount: 10000,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.shoppingMallOrders.create(
      connection,
      { body: orderCreateBody },
    );
  typia.assert(order);

  // Validate the created order
  TestValidator.equals(
    "created order number matches input",
    order.order_number,
    orderCreateBody.order_number,
  );
  TestValidator.equals("order status is pending", order.status, "pending");

  // 6. Switch to seller login again for cancellation creation
  await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody,
  });

  // 7. Seller creates order cancellation request referencing the order
  const cancellationCreateBody = {
    shopping_mall_order_id: order.id,
    status: "pending",
    reason: "Customer requested cancellation due to change of mind.",
  } satisfies IShoppingMallOrderCancellation.ICreate;

  const cancellation: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.seller.shoppingMallOrderCancellations.create(
      connection,
      { body: cancellationCreateBody },
    );
  typia.assert(cancellation);

  // Verify returned cancellation references correct order and customer
  TestValidator.equals(
    "cancellation references the correct order",
    cancellation.shopping_mall_order_id,
    order.id,
  );
  // customer id should match the customer's id from the order
  TestValidator.equals(
    "cancellation references the correct customer",
    cancellation.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "cancellation status is pending",
    cancellation.status,
    "pending",
  );
}
