import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate retrieving detailed order information by an authenticated customer.
 *
 * This test verifies the ability of a customer to access detailed data of a
 * specific order they placed.
 *
 * Workflow:
 *
 * 1. Register a new customer account and authenticate.
 * 2. Register a new seller account and authenticate.
 * 3. Create a new order associated with the customer and seller.
 * 4. Retrieve the order details by order ID as the authenticated customer.
 * 5. Verify the integrity and consistency of the returned order data.
 *
 * This ensures access control, data completeness, and business logic
 * enforcement on order detail retrieval.
 */
export async function test_api_order_detailed_information_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration and authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "TestPassword123!",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 2. Seller registration and authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const randomPasswordHash = RandomGenerator.alphaNumeric(64);
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password_hash: randomPasswordHash,
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Seller login to authenticate
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: randomPasswordHash,
      captchaChallenge: null,
      captchaResponse: null,
      rememberMe: false,
      metadata: {},
      twoFactorCode: null,
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 3. Create an order linked to the customer and seller
  const orderNumber = `ORD-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const orderTotalPrice = 10000; // realistic amount
  const orderStatus = "Pending Payment";
  const orderBusinessStatus = "initial";
  const paymentMethod = "Credit Card";
  const shippingAddress = `${RandomGenerator.name(1)}, 123 Test St, City, Country`;

  const orderCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: seller.id,
    order_number: orderNumber,
    total_price: orderTotalPrice,
    status: orderStatus,
    business_status: orderBusinessStatus,
    payment_method: paymentMethod,
    shipping_address: shippingAddress,
  } satisfies IShoppingMallOrder.ICreate;

  const createdOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(createdOrder);

  // Switch authentication to customer login in case token switched
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "TestPassword123!",
      __typename: "ILogin",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 4. Retrieve detailed order information by order ID
  const retrievedOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.at(connection, {
      orderId: createdOrder.id,
    });
  typia.assert(retrievedOrder);

  // 5. Validate key properties for consistency
  TestValidator.equals(
    "retrieved order id matches created order",
    retrievedOrder.id,
    createdOrder.id,
  );
  TestValidator.equals(
    "retrieved order customer id matches created customer",
    retrievedOrder.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "retrieved order seller id matches created seller",
    retrievedOrder.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "retrieved order number matches created order number",
    retrievedOrder.order_number,
    orderNumber,
  );
  TestValidator.equals(
    "retrieved order total price matches created total price",
    retrievedOrder.total_price,
    orderTotalPrice,
  );
  TestValidator.equals(
    "retrieved order status matches created status",
    retrievedOrder.status,
    orderStatus,
  );
  TestValidator.equals(
    "retrieved order business status matches created business status",
    retrievedOrder.business_status,
    orderBusinessStatus,
  );
  TestValidator.equals(
    "retrieved order payment method matches created payment method",
    retrievedOrder.payment_method,
    paymentMethod,
  );
  TestValidator.equals(
    "retrieved order shipping address matches created shipping address",
    retrievedOrder.shipping_address,
    shippingAddress,
  );
}
