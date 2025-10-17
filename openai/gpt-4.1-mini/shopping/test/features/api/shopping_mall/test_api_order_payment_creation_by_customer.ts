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
 * This E2E test function validates the complete flow of customer payment
 * creation for an order. It starts by registering a customer and a seller with
 * their respective APIs to authenticate and obtain authorization tokens. Then,
 * a seller account is created through admin APIs for associating the order. An
 * order, linked to both the authenticated customer and seller, is created using
 * the customer's orders creation endpoint with appropriate realistic values
 * that comply with its schema and descriptions. After the order creation, it
 * performs the payment creation for that order by calling the payment creation
 * endpoint with valid payment details such as amount, method, and status,
 * adhering strictly to permitted enum values and formats. The function asserts
 * correctness of the returned entities at each step using typia.assert to
 * ensure data integrity, and verifies the relationships between created
 * entities as per business logic. This test validates the secure and integrated
 * workflow for payments in the shopping mall system, covering authentication,
 * data consistency, and role-based access.
 */
export async function test_api_order_payment_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "TestPassword123!",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 2. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerCredentials: IShoppingMallSeller.ICreate = {
    email: sellerEmail,
    password_hash: "FakeHashedPass123!",
    company_name: "SellerCo Ltd.",
    contact_name: "John Smith",
    phone_number: RandomGenerator.mobile(),
    status: "active",
  };

  // No need to login customer again here as the join call sets auth token

  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCredentials,
    });
  typia.assert(seller);

  // 3. Customer creates an order associated with the customer and seller
  const orderNumber = RandomGenerator.alphaNumeric(12);
  const orderData: IShoppingMallOrder.ICreate = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: seller.id,
    order_number: orderNumber,
    total_price: 1000,
    status: "Pending Payment",
    business_status: "new",
    payment_method: "credit_card",
    shipping_address: "123 Test Street, Seoul, South Korea",
  };

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderData,
    });
  typia.assert(order);

  // 4. Customer creates a payment record for the order
  const paymentData: IShoppingMallPayment.ICreate = {
    shopping_mall_order_id: order.id,
    payment_amount: order.total_price,
    payment_method: order.payment_method,
    payment_status: "Pending",
    transaction_id: null,
    confirmed_at: null,
  };

  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.customer.orders.payments.createPayment(
      connection,
      {
        orderId: order.id,
        body: paymentData,
      },
    );
  typia.assert(payment);

  TestValidator.equals(
    "payment linked to order",
    payment.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "payment amount correct",
    payment.payment_amount,
    order.total_price,
  );
  TestValidator.equals(
    "payment method matches order",
    payment.payment_method,
    order.payment_method,
  );
  TestValidator.predicate(
    "payment status is valid",
    ["Pending", "Completed", "Failed"].includes(payment.payment_status),
  );
}
