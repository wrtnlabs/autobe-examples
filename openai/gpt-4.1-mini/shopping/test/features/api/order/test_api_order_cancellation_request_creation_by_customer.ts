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
 * Validate the creation of a cancellation request for a shopping mall order by
 * an authenticated customer.
 *
 * The test covers the complete flow:
 *
 * 1. Register and authenticate a new customer user.
 * 2. Register and authenticate an admin user.
 * 3. Create a new seller account.
 * 4. Create an order under the authenticated customer and created seller.
 * 5. Submit a cancellation request for the created order with reason and status
 *    set to "pending".
 *
 * Each step asserts data validity, correct property associations, and follows
 * chronological order. The cancellation request object is validated for proper
 * linkage and status correctness.
 *
 * This test ensures the cancellation request creation endpoint works as
 * expected with full role context, data integrity, and API compliance.
 */
export async function test_api_order_cancellation_request_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration and authentication
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "Password123!",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customerAuth);

  // 2. Admin registration and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: RandomGenerator.alphaNumeric(64),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 3. Seller creation
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: sellerEmail,
        password_hash: RandomGenerator.alphaNumeric(64),
        company_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 4. Order creation
  const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const orderTotalPrice = Number((100 + Math.random() * 900).toFixed(2));
  const orderStatus = "Pending Payment";
  const orderBusinessStatus = "new";
  const paymentMethod = "credit_card";
  const shippingAddress = `${RandomGenerator.name()}, 123 Test St, Test City, South Korea`;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customerAuth.id,
        shopping_mall_seller_id: seller.id,
        order_number: orderNumber,
        total_price: orderTotalPrice,
        status: orderStatus,
        business_status: orderBusinessStatus,
        payment_method: paymentMethod,
        shipping_address: shippingAddress,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);
  TestValidator.equals(
    "order.customer_id matches",
    order.shopping_mall_customer_id,
    customerAuth.id,
  );
  TestValidator.equals(
    "order.seller_id matches",
    order.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "order.status is Pending Payment",
    order.status,
    orderStatus,
  );

  // 5. Cancellation request creation
  const nowISOString = new Date().toISOString();
  const cancellationReason = "Change of mind";
  const cancellationStatus = "pending";

  const cancellationRequest: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.customer.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: {
          shopping_mall_order_id: order.id,
          shopping_mall_customer_id: customerAuth.id,
          reason: cancellationReason,
          status: cancellationStatus,
          requested_at: nowISOString,
          processed_at: null,
          created_at: nowISOString,
          updated_at: nowISOString,
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);

  TestValidator.equals(
    "cancellationRequest.order_id matches",
    cancellationRequest.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "cancellationRequest.customer_id matches",
    cancellationRequest.shopping_mall_customer_id,
    customerAuth.id,
  );
  TestValidator.equals(
    "cancellationRequest.reason matches",
    cancellationRequest.reason,
    cancellationReason,
  );
  TestValidator.equals(
    "cancellationRequest.status is pending",
    cancellationRequest.status,
    cancellationStatus,
  );
  TestValidator.predicate(
    "cancellationRequest.processed_at is null",
    cancellationRequest.processed_at === null,
  );
}
