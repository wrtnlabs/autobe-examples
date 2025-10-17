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
 * Test the workflow of updating a payment record for a specific order by an
 * authenticated customer.
 *
 * This test includes:
 *
 * 1. Seller registration and authentication
 * 2. Customer registration and authentication
 * 3. Order creation with detailed information
 * 4. Initial payment record creation linked to the order
 * 5. Updating the payment record with new details
 * 6. Validation of response data ensuring proper update and data integrity
 */
export async function test_api_payment_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Seller registration and authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password_hash: RandomGenerator.alphaNumeric(60),
      status: "active",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 2. Customer registration and authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "securePassword123",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 3. Order creation
  const orderNumber = RandomGenerator.alphaNumeric(12);
  const orderBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: seller.id,
    order_number: orderNumber,
    total_price: 150.5,
    status: "Pending Payment",
    business_status: "new",
    payment_method: "credit_card",
    shipping_address: "1234 Main St, City, Country",
  } satisfies IShoppingMallOrder.ICreate;

  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);

  // 4. Payment creation
  const paymentBody = {
    shopping_mall_order_id: order.id,
    payment_amount: 150.5,
    payment_method: "credit_card",
    payment_status: "Pending",
    transaction_id: null,
    confirmed_at: null,
  } satisfies IShoppingMallPayment.ICreate;

  const payment =
    await api.functional.shoppingMall.customer.orders.payments.createPayment(
      connection,
      {
        orderId: order.id,
        body: paymentBody,
      },
    );
  typia.assert(payment);

  // 5. Payment update
  const updatedPaymentBody = {
    shopping_mall_order_id: order.id,
    payment_amount: 150.5,
    payment_method: "credit_card",
    payment_status: "Completed",
    transaction_id: "TRANS123456789",
    confirmed_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.IUpdate;

  const updatedPayment =
    await api.functional.shoppingMall.customer.orders.payments.putByOrderidAndPaymentid(
      connection,
      {
        orderId: order.id,
        paymentId: payment.id,
        body: updatedPaymentBody,
      },
    );
  typia.assert(updatedPayment);

  // 6. Assertions
  TestValidator.equals(
    "updated payment id matches",
    updatedPayment.id,
    payment.id,
  );
  TestValidator.equals(
    "updated payment order id matches",
    updatedPayment.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "payment status updated to Completed",
    updatedPayment.payment_status,
    "Completed",
  );
  TestValidator.equals(
    "payment transaction id set correctly",
    updatedPayment.transaction_id,
    "TRANS123456789",
  );
  TestValidator.predicate(
    "confirmed_at is valid ISO date",
    !isNaN(Date.parse(updatedPayment.confirmed_at!)),
  );
}
