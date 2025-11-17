import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";

/**
 * Test creating a new payment record in shopping mall payment system.
 *
 * This test performs the following steps:
 *
 * 1. Admin user signs up and logs in to establish admin context.
 * 2. Customer user signs up and logs in to create a valid shopping mall order.
 * 3. Customer creates an order with realistic data including order number, status,
 *    payment status, total amount, and shipping address.
 * 4. Admin logs back in to the system to get fresh admin authentication context.
 * 5. Admin creates a payment linked to the order with detailed payment info
 *    including method, status, amount, unique transaction ID, and payment
 *    date.
 * 6. Validations confirm API responses have correct shape and data integrity,
 *    including correct linkage and realistic values.
 *
 * This test ensures the multi-actor authentication and authorization flows work
 * correctly, and that payments can only be created by authorized admins with
 * valid associated orders.
 */
export async function test_api_shopping_mall_admin_payment_creation_with_order(
  connection: api.IConnection,
) {
  // 1. Admin user joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "admin-password",
    href: "https://test.admin.join/href",
    referrer: "https://test.admin.join/referrer",
  } satisfies IShoppingMallAdmin.IJoin;
  const adminJoined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminJoined);

  // 2. Admin user logs in
  const adminLoginBody = {
    email: adminEmail,
    password: "admin-password",
    href: "https://test.admin.login/href",
    referrer: "https://test.admin.login/referrer",
  } satisfies IShoppingMallAdmin.ILogin;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoggedIn);

  // 3. Customer user joins
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "customer-password",
    href: "https://test.customer.join/href",
    referrer: "https://test.customer.join/referrer",
  } satisfies IShoppingMallCustomer.ICreate;
  const customerJoined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerJoined);

  // 4. Customer user logs in
  const customerLoginBody = {
    email: customerEmail,
    password: "customer-password",
    href: "https://test.customer.login/href",
    referrer: "https://test.customer.login/referrer",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 5. Customer creates an order
  const orderNumber = `ORD-${Date.now()}-${RandomGenerator.alphaNumeric(5)}`;
  const orderBody = {
    order_number: orderNumber,
    order_status: "pending",
    payment_status: "not_paid",
    total_amount: 10000,
    shipping_address: "123 Test Street, Test City, Test Country",
  } satisfies IShoppingMallOrder.ICreate;
  const createdOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(createdOrder);

  // 6. Admin logs in again to refresh admin context and token
  const adminLoggedInAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoggedInAgain);

  // 7. Admin creates a payment linked to the created order
  const paymentTransactionId = `TXN-${Date.now()}-${RandomGenerator.alphaNumeric(6)}`;
  const paymentDate = new Date().toISOString();

  const paymentBody = {
    shopping_mall_order_id: createdOrder.id,
    payment_method: "credit_card",
    payment_status: "completed",
    payment_amount: createdOrder.total_amount,
    transaction_id: paymentTransactionId,
    payment_date: paymentDate,
  } satisfies IShoppingMallPayment.ICreate;

  const createdPayment: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.payments.create(connection, {
      body: paymentBody,
    });

  typia.assert(createdPayment);

  // 8. Validate payment response matches input values
  TestValidator.equals(
    "payment order ID matches",
    createdPayment.shopping_mall_order_id,
    createdOrder.id,
  );
  TestValidator.equals(
    "payment method matches",
    createdPayment.payment_method,
    paymentBody.payment_method,
  );
  TestValidator.equals(
    "payment status matches",
    createdPayment.payment_status,
    paymentBody.payment_status,
  );
  TestValidator.equals(
    "payment amount matches",
    createdPayment.payment_amount,
    paymentBody.payment_amount,
  );
  TestValidator.equals(
    "payment transaction ID matches",
    createdPayment.transaction_id,
    paymentBody.transaction_id,
  );
  TestValidator.equals(
    "payment date matches",
    createdPayment.payment_date,
    paymentBody.payment_date,
  );
}
