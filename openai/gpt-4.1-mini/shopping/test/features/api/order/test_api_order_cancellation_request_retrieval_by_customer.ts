import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test Scenario: Order Cancellation Request Retrieval by Customer
 *
 * This comprehensive end-to-end test simulates the full customer journey for
 * retrieving a specific cancellation request tied to an order in the shopping
 * mall system.
 *
 * Steps:
 *
 * 1. Customer signs up via /auth/customer/join and authenticates.
 * 2. Seller signs up via /auth/seller/join and authenticates.
 * 3. Create customer record for order association.
 * 4. Create seller record to associate with order.
 * 5. Customer creates an order linked to the created customer and seller.
 * 6. Customer creates a cancellation request for the order.
 * 7. Customer retrieves the specific cancellation request by its ID.
 * 8. Validate that the cancellation request data matches what was created.
 */
export async function test_api_order_cancellation_request_retrieval_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Customer sign up
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!",
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    { body: customerJoinBody },
  );
  typia.assert(customerAuthorized);

  // Step 2: Seller sign up
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "StrongPassword123!",
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  // Add optional fields company_name and contact_name with realistic values
  const sellerCreateBody: IShoppingMallSeller.ICreate = {
    ...sellerJoinBody,
    company_name: "Best Seller Co.",
    contact_name: "John Seller",
    phone_number: RandomGenerator.mobile(),
  };
  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerCreateBody,
  });
  typia.assert(sellerAuthorized);

  // Step 3: Create a customer record to associate with order
  const customerCreateBody = {
    email: customerAuthorized.email,
    password_hash: "hashedpassword",
    status: "active",
    nickname: "customer_nick",
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer = await api.functional.shoppingMall.customers.create(
    connection,
    { body: customerCreateBody },
  );
  typia.assert(customer);

  // Step 4: Create seller record for order
  const sellerCreateForOrderBody = {
    email: sellerAuthorized.email,
    password_hash: sellerAuthorized.password_hash,
    status: "active",
    company_name: sellerAuthorized.company_name ?? null,
    contact_name: sellerAuthorized.contact_name ?? null,
    phone_number: sellerAuthorized.phone_number ?? null,
  } satisfies IShoppingMallSeller.ICreate;
  const seller = await api.functional.shoppingMall.admin.sellers.create(
    connection,
    { body: sellerCreateForOrderBody },
  );
  typia.assert(seller);

  // Step 5: Create order linked to created customer and seller
  const orderCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: seller.id,
    order_number: `ORDER-${RandomGenerator.alphaNumeric(10)}`,
    total_price: 150.75,
    status: "Paid",
    business_status: "Processing",
    payment_method: "credit_card",
    shipping_address: "123 Test Address, City, Country",
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderCreateBody },
  );
  typia.assert(order);

  // Step 6: Customer creates cancellation request for the order
  const requestTime = new Date().toISOString();
  const cancellationRequestCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_customer_id: customer.id,
    reason: "Change of mind",
    status: "pending",
    requested_at: requestTime,
    processed_at: null,
    created_at: requestTime,
    updated_at: requestTime,
  } satisfies IShoppingMallCancellationRequest.ICreate;
  const cancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: cancellationRequestCreateBody,
      },
    );
  typia.assert(cancellationRequest);

  // Step 7: Customer retrieves the specific cancellation request by id
  const retrievedRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.at(
      connection,
      {
        orderId: order.id,
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);

  // Step 8: Validate cancellation request data
  TestValidator.equals(
    "cancellation request id",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "cancellation request reason",
    retrievedRequest.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "cancellation request status",
    retrievedRequest.status,
    cancellationRequest.status,
  );
  TestValidator.equals(
    "cancellation request order id",
    retrievedRequest.shopping_mall_order_id,
    cancellationRequest.shopping_mall_order_id,
  );
  TestValidator.equals(
    "cancellation request customer id",
    retrievedRequest.shopping_mall_customer_id,
    cancellationRequest.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "cancellation request requested at",
    retrievedRequest.requested_at,
    cancellationRequest.requested_at,
  );
  TestValidator.equals(
    "cancellation request processed at",
    retrievedRequest.processed_at,
    cancellationRequest.processed_at,
  );
  TestValidator.equals(
    "cancellation request created at",
    retrievedRequest.created_at,
    cancellationRequest.created_at,
  );
  TestValidator.equals(
    "cancellation request updated at",
    retrievedRequest.updated_at,
    cancellationRequest.updated_at,
  );
}
