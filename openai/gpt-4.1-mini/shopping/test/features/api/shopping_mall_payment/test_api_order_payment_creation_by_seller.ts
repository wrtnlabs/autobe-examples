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
 * Validate the complete payment creation process by a seller for an order.
 *
 * This test covers the entire realistic workflow within the e-commerce
 * platform. It verifies role-based access and business rules for payment
 * creation.
 *
 * Process steps:
 *
 * 1. Create and authenticate a seller account via join.
 * 2. Create and authenticate a customer account via join.
 * 3. Create an order linked to both seller and customer.
 * 4. Authenticate again as seller to simulate role switch.
 * 5. Create a payment record associated with the order as the seller.
 * 6. Validate the payment creation response for correctness and consistency.
 *
 * This confirms that the platform correctly manages permissions, associations,
 * and payment business validations for seller-initiated payments.
 */
export async function test_api_order_payment_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerP@ssw0rd";
  const sellerCreateBody = {
    email: sellerEmail,
    password_hash: sellerPassword,
    company_name: RandomGenerator.name(2),
    contact_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 2. Create and authenticate customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerP@ssw0rd";
  const customerCreateBody = {
    email: customerEmail,
    password: customerPassword,
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 3. Create an order linked to seller and customer
  const orderNumber = `${RandomGenerator.alphaNumeric(4).toUpperCase()}${Date.now()}`;
  const orderCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: seller.id,
    order_number: orderNumber,
    total_price: 100000, // realistic amount
    status: "Pending Payment",
    business_status: "New",
    payment_method: "credit_card",
    shipping_address: `${RandomGenerator.name(1)} street, Seoul, South Korea`,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);
  TestValidator.equals(
    "order customer id matches create",
    order.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "order seller id matches create",
    order.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "order number matches create",
    order.order_number,
    orderNumber,
  );

  // 4. Authenticate again as seller to simulate role switching
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);
  TestValidator.equals(
    "re-login seller id matches join",
    sellerLogin.id,
    seller.id,
  );

  // 5. Create payment record for the order as the seller
  const paymentCreateBody = {
    shopping_mall_order_id: order.id,
    payment_amount: order.total_price, // full amount
    payment_method: "credit_card",
    payment_status: "Completed",
    transaction_id: `TXN-${Date.now()}`,
    confirmed_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;

  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.seller.orders.payments.createPayment(
      connection,
      {
        orderId: order.id,
        body: paymentCreateBody,
      },
    );
  typia.assert(payment);

  TestValidator.equals(
    "payment order id matches",
    payment.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "payment amount matches order total",
    payment.payment_amount,
    order.total_price,
  );
  TestValidator.equals(
    "payment method matches",
    payment.payment_method,
    paymentCreateBody.payment_method,
  );
  TestValidator.equals(
    "payment status matches",
    payment.payment_status,
    "Completed",
  );
  TestValidator.predicate(
    "payment transaction id present",
    typeof payment.transaction_id === "string" &&
      payment.transaction_id.length > 0,
  );
  TestValidator.predicate(
    "payment confirmed_at is ISO string",
    typeof payment.confirmed_at === "string",
  );
}
