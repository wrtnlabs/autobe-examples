import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";

export async function test_api_admin_payment_update_post_creation_and_order(
  connection: api.IConnection,
) {
  // 1. Customer joins as a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "TestPassword123!",
        href: "https://www.example.com/signup",
        referrer: "https://www.example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Customer logs in (simulate user switch to customer)
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: "TestPassword123!",
        href: "https://www.example.com/login",
        referrer: "https://www.example.com",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(customerLogin);

  // 3. Customer creates an order
  const orderBody = {
    order_number: `ORDER-${RandomGenerator.alphaNumeric(10)}`,
    order_status: "pending",
    payment_status: "unpaid",
    total_amount: 12345,
    shipping_address: "123 Seoul, Korea",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 4. Admin joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!@#",
        href: "https://admin.example.com/signup",
        referrer: "https://admin.example.com",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 5. Admin logs in (simulate switch to admin)
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!@#",
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 6. Admin creates a payment linked to the order
  const paymentBody = {
    shopping_mall_order_id: order.id,
    payment_method: "credit_card",
    payment_status: "completed",
    payment_amount: order.total_amount,
    transaction_id: `TXN${RandomGenerator.alphaNumeric(12)}`,
    payment_date: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;

  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.payments.create(connection, {
      body: paymentBody,
    });
  typia.assert(payment);

  // 7. Admin updates the payment record with new details
  const updateBody = {
    payment_method: "paypal",
    payment_status: "refunded",
    payment_amount: payment.payment_amount - 1000,
    transaction_id: `TXN${RandomGenerator.alphaNumeric(12)}`,
    payment_date: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  } satisfies IShoppingMallPayment.IUpdate;

  const updatedPayment: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.payments.update(connection, {
      paymentId: payment.id,
      body: updateBody,
    });
  typia.assert(updatedPayment);

  // 8. Validate the updated payment reflects changes
  TestValidator.equals(
    "paymentMethod updated",
    updatedPayment.payment_method,
    updateBody.payment_method,
  );
  TestValidator.equals(
    "paymentStatus updated",
    updatedPayment.payment_status,
    updateBody.payment_status,
  );
  TestValidator.equals(
    "paymentAmount updated",
    updatedPayment.payment_amount,
    updateBody.payment_amount,
  );
  TestValidator.equals(
    "transactionId updated",
    updatedPayment.transaction_id,
    updateBody.transaction_id,
  );
  TestValidator.equals(
    "paymentDate updated",
    updatedPayment.payment_date,
    updateBody.payment_date,
  );
}
