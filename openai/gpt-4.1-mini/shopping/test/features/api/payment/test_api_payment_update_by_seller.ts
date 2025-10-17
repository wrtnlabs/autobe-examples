import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_payment_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller signs up (register)
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password_hash: "hashed_password_placeholder",
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Customer signs up (register)
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customerPassword123",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. Create an order by the customer associated with seller
  const orderNumber = `ORD-${Date.now()}`;
  const orderCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: seller.id,
    order_number: orderNumber,
    total_price: 10000,
    status: "pending",
    business_status: "new",
    payment_method: "credit_card",
    shipping_address: "1234 Elm Street, Seoul",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);
  TestValidator.equals(
    "Order customer ID",
    order.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "Order seller ID",
    order.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals("Order order number", order.order_number, orderNumber);

  // 4. Create a payment record for the order
  const paymentCreateBody = {
    shopping_mall_order_id: order.id,
    payment_amount: 10000,
    payment_method: "credit_card",
    payment_status: "pending",
    transaction_id: null,
    confirmed_at: null,
  } satisfies IShoppingMallPayment.ICreate;

  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.customer.orders.payments.createPayment(
      connection,
      {
        orderId: order.id,
        body: paymentCreateBody,
      },
    );
  typia.assert(payment);
  TestValidator.equals(
    "Payment belongs to order",
    payment.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals("Payment status", payment.payment_status, "pending");

  // 5. Update payment record by seller
  // Switch context to seller authentication
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password_hash: "hashed_password_placeholder",
      status: "active",
    } satisfies IShoppingMallSeller.ICreate,
  });

  const paymentUpdateBody = {
    shopping_mall_order_id: order.id,
    payment_amount: 10000,
    payment_method: "credit_card",
    payment_status: "completed",
    transaction_id: `TXN-${Date.now()}`,
    confirmed_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.IUpdate;

  const updatedPayment: IShoppingMallPayment =
    await api.functional.shoppingMall.seller.orders.payments.updatePayment(
      connection,
      {
        orderId: order.id,
        paymentId: payment.id,
        body: paymentUpdateBody,
      },
    );
  typia.assert(updatedPayment);
  TestValidator.equals("Updated payment ID", updatedPayment.id, payment.id);
  TestValidator.equals(
    "Updated payment status",
    updatedPayment.payment_status,
    "completed",
  );
  TestValidator.equals(
    "Updated transaction ID",
    updatedPayment.transaction_id,
    paymentUpdateBody.transaction_id,
  );
  TestValidator.predicate(
    "Confirmed at is ISO string",
    !!updatedPayment.confirmed_at &&
      !isNaN(Date.parse(updatedPayment.confirmed_at)),
  );
}
