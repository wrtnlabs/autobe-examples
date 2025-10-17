import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * E2E test verifying the seller's ability to update a payment record linked to
 * an order.
 *
 * Business context:
 *
 * 1. Seller, customer, and admin accounts are created and authenticated.
 * 2. A customer record and a seller record are created via admin APIs.
 * 3. The customer places an order associated with the seller.
 * 4. A payment record linked to the order is created by the customer.
 * 5. The seller authenticates and updates the payment record.
 * 6. Returned payment data is verified to confirm the updates applied exactly.
 *
 * This test covers role authentication, entity creation, cross-entity
 * relationships, update request compliance, and response validation using
 * typia.assert. It ensures that only an authenticated seller can perform the
 * update, and the update data is honored.
 */
export async function test_api_seller_payment_update(
  connection: api.IConnection,
) {
  // 1-2. Seller and customer join and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "password123";

  // Corrected to use password_hash for seller join
  const sellerJoinBody = {
    email: sellerEmail,
    password_hash: sellerPassword,
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerAuthorized);

  // Seller login uses IShoppingMallSeller.ILogin with password field
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "password123";

  // Customer join body conforms to IShoppingMallCustomer.IJoin
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // Customer login requires __typename field
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    __typename: "ShoppingMallCustomerLogin",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 3. Create customer record including required 'status'
  const customerCreateBody = {
    email: customerEmail,
    password_hash: customerPassword,
    status: "active",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 4. Create seller record via admin API including 'status'
  const sellerCreateBody = {
    email: sellerEmail,
    password_hash: sellerPassword,
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 5. Customer places order associated with seller
  const orderNumber = `ORD-${RandomGenerator.alphaNumeric(10)}`;
  const orderCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: seller.id,
    order_number: orderNumber,
    total_price: 100.0,
    status: "pending",
    business_status: "created",
    payment_method: "credit_card",
    shipping_address: "123 Test St, City, Country",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 6. Customer creates payment linked to order, explicitly passing nulls
  const paymentCreateBody = {
    shopping_mall_order_id: order.id,
    payment_amount: 100.0,
    payment_method: "credit_card",
    payment_status: "pending",
    transaction_id: null,
    confirmed_at: null,
  } satisfies IShoppingMallPayment.ICreate;
  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.customer.orders.payments.createPayment(
      connection,
      { orderId: order.id, body: paymentCreateBody },
    );
  typia.assert(payment);

  // 7. Seller logs in again to establish auth context for update
  const sellerLoginAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAgain);

  // 8. Seller updates payment record with fixed update values
  const updatedPaymentAmount = 120.5;
  const updatedPaymentMethod = "paypal";
  const updatedPaymentStatus = "completed";
  const updatedTransactionId = `TXN-${RandomGenerator.alphaNumeric(15)}`;
  const updatedConfirmedAt = new Date().toISOString();

  const paymentUpdateBody = {
    shopping_mall_order_id: order.id,
    payment_amount: updatedPaymentAmount,
    payment_method: updatedPaymentMethod,
    payment_status: updatedPaymentStatus,
    transaction_id: updatedTransactionId,
    confirmed_at: updatedConfirmedAt,
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

  // 9. Validate that update applied correctly
  TestValidator.equals(
    "payment amount updated",
    updatedPayment.payment_amount,
    updatedPaymentAmount,
  );
  TestValidator.equals(
    "payment method updated",
    updatedPayment.payment_method,
    updatedPaymentMethod,
  );
  TestValidator.equals(
    "payment status updated",
    updatedPayment.payment_status,
    updatedPaymentStatus,
  );
  TestValidator.equals(
    "transaction id updated",
    updatedPayment.transaction_id,
    updatedTransactionId,
  );
  TestValidator.equals(
    "confirmed at updated",
    updatedPayment.confirmed_at,
    updatedConfirmedAt,
  );
}
