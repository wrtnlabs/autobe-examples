import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the refund request update process performed by a seller.
 *
 * This test simulates the business flow involving both customer and seller
 * roles. It covers customer account creation and login, order creation, refund
 * request creation, seller account creation and login, and finally the refund
 * request update by the seller.
 *
 * The scenario validates the correctness of role-based access control, API
 * response shapes, and state transitions for refund requests.
 *
 * Steps:
 *
 * 1. Customer joins and logs in
 * 2. Customer creates an order
 * 3. Customer creates a refund request linked to the order
 * 4. Seller joins and logs in
 * 5. Seller updates the refund request
 *
 * All API responses are validated with typia.assert and all required fields are
 * supplied with realistic values.
 */
export async function test_api_refund_request_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Customer joins
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // 2. Customer logs in
  const customerLoginBody = {
    email: customer.email,
    password: "1234",
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogin);

  // 3. Customer creates an order
  const orderCreateBody = {
    order_number: RandomGenerator.alphaNumeric(10),
    order_status: "pending",
    payment_status: "pending",
    total_amount: 10000,
    shipping_address: "123 Main St, Seoul, South Korea",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 4. Customer creates refund request linked to the order
  const refundRequestCreateBody = {
    shopping_mall_order_id: order.id,
    refund_amount: 5000,
    refund_reason: "Order defective",
  } satisfies IShoppingMallRefundRequest.ICreate;
  const refundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.customer.refundRequests.create(
      connection,
      { body: refundRequestCreateBody },
    );
  typia.assert(refundRequest);

  // 5. Seller joins
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 6. Seller logs in
  const sellerLoginBody = {
    email: seller.email,
    password: "1234",
    ip: null,
    href: "https://example.com/seller-login",
    referrer: "https://example.com",
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 7. Seller updates refund request
  const refundRequestUpdateBody = {
    refund_amount: 4500, // Adjusted refund amount
    refund_reason: "Order partially defective",
    refund_status: "approved",
    processed_at: new Date().toISOString(),
  } satisfies IShoppingMallRefundRequest.IUpdate;
  const updatedRefundRequest: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.seller.refundRequests.update(connection, {
      refundRequestId: refundRequest.id,
      body: refundRequestUpdateBody,
    });
  typia.assert(updatedRefundRequest);

  TestValidator.equals(
    "updated refund amount matches",
    updatedRefundRequest.refund_amount,
    4500,
  );
  TestValidator.equals(
    "updated refund reason matches",
    updatedRefundRequest.refund_reason,
    "Order partially defective",
  );
  TestValidator.equals(
    "updated refund status matches",
    updatedRefundRequest.refund_status,
    "approved",
  );
  TestValidator.predicate(
    "processed_at is valid ISO string",
    typeof updatedRefundRequest.processed_at === "string" &&
      updatedRefundRequest.processed_at.length > 0,
  );
}
