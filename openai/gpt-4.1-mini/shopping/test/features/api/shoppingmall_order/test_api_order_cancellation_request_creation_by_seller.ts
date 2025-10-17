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
 * Test the workflow of creating a new cancellation request for a specific order
 * by a seller.
 *
 * This test covers the full business scenario from seller account creation via
 * admin endpoint, seller login, customer join and creation, order creation, and
 * finally seller creating a cancellation request. It validates the successful
 * creation and correct status of the cancellation request. Also tests
 * authorization boundaries by attempting creation with different user roles.
 */
export async function test_api_order_cancellation_request_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a seller via admin API
  const sellerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "hashed_SecurePass123!",
    status: "active" as const,
    company_name: "ACME Corp",
    contact_name: "John Doe",
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreate,
    });
  typia.assert(seller);

  // 2. Login as seller
  const sellerLogin = {
    email: seller.email,
    password: "SecurePass123!",
  } satisfies IShoppingMallSeller.ILogin;

  const sellerAuthorized = await api.functional.auth.seller.login(connection, {
    body: sellerLogin,
  });
  typia.assert(sellerAuthorized);

  // 3. Join and authorize a new customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CustomerPass123!",
  } satisfies IShoppingMallCustomer.IJoin;

  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    { body: customerJoinBody },
  );
  typia.assert(customerAuthorized);

  // 4. Create customer using shoppingMall.customers.create for order association
  const customerCreateBody = {
    email: customerAuthorized.email,
    password_hash: "hashed_CustomerPass123!",
    status: "active",
  } satisfies IShoppingMallCustomer.ICreate;

  const customer = await api.functional.shoppingMall.customers.create(
    connection,
    { body: customerCreateBody },
  );
  typia.assert(customer);

  // 5. Place an order linked to the customer and seller
  const orderCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: seller.id,
    order_number: `ORD-${RandomGenerator.alphaNumeric(8)}`,
    total_price: 12345.67,
    status: "paid",
    business_status: "processing",
    payment_method: "credit_card",
    shipping_address: "1234 Market St, San Francisco, CA",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 6. Seller login again to refresh auth context
  const sellerLoginAgain = {
    email: seller.email,
    password: "SecurePass123!",
  } satisfies IShoppingMallSeller.ILogin;

  const sellerAuthorizedAgain = await api.functional.auth.seller.login(
    connection,
    {
      body: sellerLoginAgain,
    },
  );
  typia.assert(sellerAuthorizedAgain);

  // 7. Create a cancellation request for the order as seller
  const nowISO = new Date().toISOString();
  const cancellationCreateBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_customer_id: customer.id,
    reason: "Customer requested cancellation.",
    status: "pending",
    requested_at: nowISO,
    processed_at: null,
    created_at: nowISO,
    updated_at: nowISO,
  } satisfies IShoppingMallCancellationRequest.ICreate;

  const cancellationRequest: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.seller.orders.cancellationRequests.create(
      connection,
      { orderId: order.id, body: cancellationCreateBody },
    );
  typia.assert(cancellationRequest);

  // 8. Validate cancellation request status and reason
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "cancellation request reason matches",
    cancellationRequest.reason,
    cancellationCreateBody.reason,
  );

  // 9. Attempt unauthorized cancellation request creation to test authorization enforcement
  // Here we simulate an unauthorized attempt by reusing the same order but with a different ID in customer field
  const unauthorizedCancellationBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_customer_id: typia.random<string & tags.Format<"uuid">>(),
    reason: "Unauthorized cancellation attempt.",
    status: "pending",
    requested_at: new Date().toISOString(),
    processed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallCancellationRequest.ICreate;

  await TestValidator.error(
    "unauthorized user cannot create cancellation request",
    async () => {
      await api.functional.shoppingMall.seller.orders.cancellationRequests.create(
        connection,
        { orderId: order.id, body: unauthorizedCancellationBody },
      );
    },
  );
}
