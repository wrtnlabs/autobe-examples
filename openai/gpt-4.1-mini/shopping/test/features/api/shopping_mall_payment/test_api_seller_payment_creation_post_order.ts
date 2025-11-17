import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the workflow where a seller creates a payment record for a customer's
 * order.
 *
 * Workflow steps:
 *
 * 1. Customer signs up by joining.
 * 2. Customer places an order with required details.
 * 3. Seller signs up by joining.
 * 4. Seller creates a payment record linked to the customer's order.
 *
 * Validations:
 *
 * - Each step should have proper assertions verifying the returned data types.
 * - Confirm the payment record correctly links to the order.
 * - Validate payment method, status, amount, and transaction id.
 * - Validate uniqueness of transaction_id by attempting to create a duplicate
 *   payment and expecting failure.
 *
 * This test simulates multi-actor authentication, switching from customer to
 * seller.
 */
export async function test_api_seller_payment_creation_post_order(
  connection: api.IConnection,
) {
  // 1. Customer signs up
  const customerEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "password1234",
        href: "https://example.com/signup",
        referrer: "https://referrer.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Customer places an order
  const orderNumber = `ORDER-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const shippingAddress = "123 Main Street, Seoul, South Korea";
  const orderStatus = "pending";
  const paymentStatus = "pending";
  const totalAmount = 100000; // realistic order amount
  const orderCreateBody = {
    order_number: orderNumber,
    order_status: orderStatus,
    payment_status: paymentStatus,
    total_amount: totalAmount,
    shipping_address: shippingAddress,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 3. Seller signs up
  const sellerEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "password1234",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 4. Seller creates a payment record for the order
  // Switch login context to seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "password1234",
      ip: null,
      href: "https://example.com/login",
      referrer: "https://referrer.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const transactionId = `TXN-${RandomGenerator.alphaNumeric(10).toUpperCase()}`;
  const paymentCreateBody = {
    shopping_mall_order_id: order.id,
    payment_method: "credit_card",
    payment_status: "completed",
    payment_amount: totalAmount,
    transaction_id: transactionId,
    payment_date: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;

  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.seller.payments.create(connection, {
      body: paymentCreateBody,
    });
  typia.assert(payment);

  TestValidator.equals(
    "payment links to order",
    payment.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "payment amount is correct",
    payment.payment_amount,
    totalAmount,
  );
  TestValidator.equals(
    "payment method is credit_card",
    payment.payment_method,
    "credit_card",
  );
  TestValidator.equals(
    "payment status is completed",
    payment.payment_status,
    "completed",
  );
  TestValidator.equals(
    "payment transaction id matches",
    payment.transaction_id,
    transactionId,
  );

  // 5. Attempt creating payment with duplicate transaction_id (should fail)
  await TestValidator.error(
    "duplicate transaction_id should fail",
    async () => {
      await api.functional.shoppingMall.seller.payments.create(connection, {
        body: {
          shopping_mall_order_id: order.id,
          payment_method: "credit_card",
          payment_status: "completed",
          payment_amount: totalAmount,
          transaction_id: transactionId, // duplicate
          payment_date: new Date().toISOString(),
        } satisfies IShoppingMallPayment.ICreate,
      });
    },
  );
}
