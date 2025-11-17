import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_payment_update_by_authenticated_seller(
  connection: api.IConnection,
) {
  // 1. Seller registers a new account via join endpoint
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "hardcodedPassword123!",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Customer registers a new account as a prerequisite
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "hardcodedPassword123!",
        href: "https://example.com/signup",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. Customer creates an order to link with the payment
  const orderNumber = RandomGenerator.alphabets(10);
  const orderStatus = "pending";
  const paymentStatus = "pending";
  const totalAmount = Number((Math.random() * 10000 + 100).toFixed(2));
  const shippingAddress = `1234 Payment St, Test City, TX`;

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

  // 4. Switch back to seller context to create a payment linked to the order
  // (no explicit login step since SDK manages single auth token implicitly)

  // Payment creation
  const paymentMethod = "credit_card";
  const payStatusCreate = "completed";
  const paymentAmount = totalAmount;
  const transactionId = `TXN-${typia.random<string & tags.Format<"uuid">>()}`;
  const paymentDate = new Date().toISOString();

  const paymentCreateBody = {
    shopping_mall_order_id: order.id,
    payment_method: paymentMethod,
    payment_status: payStatusCreate,
    payment_amount: paymentAmount,
    transaction_id: transactionId,
    payment_date: paymentDate,
  } satisfies IShoppingMallPayment.ICreate;

  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.seller.payments.create(connection, {
      body: paymentCreateBody,
    });
  typia.assert(payment);

  // 5. Update the payment record
  // New values for update
  const updatedPaymentMethod = "paypal";
  const updatedPaymentStatus = "refunded";
  const updatedPaymentAmount = Number((paymentAmount * 0.5).toFixed(2));
  const updatedTransactionId = `TXN-UPDATED-${typia.random<string & tags.Format<"uuid">>()}`;
  const updatedPaymentDate = new Date(Date.now() - 86400000).toISOString(); // One day earlier

  const paymentUpdateBody = {
    payment_method: updatedPaymentMethod,
    payment_status: updatedPaymentStatus,
    payment_amount: updatedPaymentAmount,
    transaction_id: updatedTransactionId,
    payment_date: updatedPaymentDate,
  } satisfies IShoppingMallPayment.IUpdate;

  const updatedPayment: IShoppingMallPayment =
    await api.functional.shoppingMall.seller.payments.update(connection, {
      paymentId: payment.id,
      body: paymentUpdateBody,
    });
  typia.assert(updatedPayment);

  // Validations
  TestValidator.equals(
    "updated payment id equals original",
    updatedPayment.id,
    payment.id,
  );
  TestValidator.equals(
    "updated payment order id equals original",
    updatedPayment.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "updated payment method",
    updatedPayment.payment_method,
    updatedPaymentMethod,
  );
  TestValidator.equals(
    "updated payment status",
    updatedPayment.payment_status,
    updatedPaymentStatus,
  );
  TestValidator.equals(
    "updated payment amount",
    updatedPayment.payment_amount,
    updatedPaymentAmount,
  );
  TestValidator.equals(
    "updated transaction id",
    updatedPayment.transaction_id,
    updatedTransactionId,
  );
  TestValidator.equals(
    "updated payment date",
    updatedPayment.payment_date,
    updatedPaymentDate,
  );
}
