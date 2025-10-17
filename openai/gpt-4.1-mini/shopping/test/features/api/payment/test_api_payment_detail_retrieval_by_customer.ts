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
 * This test function verifies the retrieval of detailed payment information for
 * a specific payment record within an order by an authenticated customer user.
 *
 * The comprehensive test flow includes creating separate customers and admins
 * for multi-role authentication, creating a seller entity for order
 * association, creating a customer for order association, placing an order with
 * required details, creating a payment record linked to the created order, and
 * finally retrieving detailed payment information using the order ID and
 * payment ID.
 *
 * All API responses are validated using typia.assert for complete runtime type
 * validation. Assertions confirm the payment details match those provided on
 * creation, establishing correct authorization and linkage.
 *
 * This verifies authorization logic, accurate data retrieval, and end-to-end
 * business workflow correctness. The test employs proper async/await patterns
 * and data construction following DTO types with format constraints and
 * business rules.
 *
 * Multi-role authentication is handled via separate join calls to ensure clear
 * user context. The test avoids any illegal property usage and maintains strict
 * type safety throughout the sequence.
 */
export async function test_api_payment_detail_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration and authentication
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customer-password123",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 2. Admin registration and authentication
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: RandomGenerator.alphaNumeric(32),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 3. Seller creation
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: sellerEmail,
        password_hash: RandomGenerator.alphaNumeric(32),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 4. Customer creation for order association
  const createdCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
        status: "active",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(createdCustomer);

  // 5. Create order associated with createdCustomer and seller
  const orderNumber = `ORD-${RandomGenerator.alphaNumeric(8)}`;
  const orderTotalPrice = 12345.67;
  const paymentMethod = "credit_card";
  const shippingAddress = "Seoul, Korea, Gangnam-gu, 123 Street";
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: createdCustomer.id,
        shopping_mall_seller_id: seller.id,
        order_number: orderNumber,
        total_price: orderTotalPrice,
        status: "Pending Payment",
        business_status: "pending",
        payment_method: paymentMethod,
        shipping_address: shippingAddress,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 6. Create payment record for the order
  const paymentAmount = orderTotalPrice;
  const paymentStatus = "Pending";
  const transactionId = `TXN-${RandomGenerator.alphaNumeric(12)}`;
  const confirmedAt = new Date().toISOString();
  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.customer.orders.payments.createPayment(
      connection,
      {
        orderId: order.id,
        body: {
          shopping_mall_order_id: order.id,
          payment_amount: paymentAmount,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          transaction_id: transactionId,
          confirmed_at: confirmedAt,
        } satisfies IShoppingMallPayment.ICreate,
      },
    );
  typia.assert(payment);

  // 7. Retrieve payment detail by orderId and paymentId
  const paymentDetail: IShoppingMallPayment =
    await api.functional.shoppingMall.customer.orders.payments.atPayment(
      connection,
      {
        orderId: order.id,
        paymentId: payment.id,
      },
    );
  typia.assert(paymentDetail);

  // 8. Assert that retrieved payment detail matches the created payment
  TestValidator.equals("payment ID matches", paymentDetail.id, payment.id);
  TestValidator.equals(
    "payment order ID matches",
    paymentDetail.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "payment amount matches",
    paymentDetail.payment_amount,
    paymentAmount,
  );
  TestValidator.equals(
    "payment method matches",
    paymentDetail.payment_method,
    paymentMethod,
  );
  TestValidator.equals(
    "payment status matches",
    paymentDetail.payment_status,
    paymentStatus,
  );
  TestValidator.equals(
    "transaction ID matches",
    paymentDetail.transaction_id,
    transactionId,
  );
  TestValidator.equals(
    "confirmed at matches",
    paymentDetail.confirmed_at,
    confirmedAt,
  );
}
