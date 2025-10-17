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

export async function test_api_order_cancellation_request_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin signup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongP@ssw0rd";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      type: "admin",
      remember_me: false,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 3. Customer creation
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustPass123";
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: {
        email: customerEmail,
        password_hash: customerPassword,
        nickname: RandomGenerator.name(2),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Seller creation
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPasswordHash = "SellerPass123";
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: sellerEmail,
        password_hash: sellerPasswordHash,
        company_name: RandomGenerator.name(3),
        contact_name: RandomGenerator.name(2),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 5. Customer order creation
  const orderNumber = `ORD-${Date.now()}-${RandomGenerator.alphaNumeric(6)}`;
  const orderTotalPrice = Number((Math.random() * 500 + 50).toFixed(2));
  const orderPaymentMethod = "credit_card";
  const orderShippingAddress = `${RandomGenerator.name(1)}, 123 Test St, Test City`;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: seller.id,
        order_number: orderNumber,
        total_price: orderTotalPrice,
        status: "paid",
        business_status: "processing",
        payment_method: orderPaymentMethod,
        shipping_address: orderShippingAddress,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 6. Admin creates cancellation request for the order
  const cancellationReason =
    "Customer requested cancellation due to order delay.";
  const now = new Date().toISOString();

  const cancellationRequest: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.admin.orders.cancellationRequests.create(
      connection,
      {
        orderId: order.id,
        body: {
          shopping_mall_order_id: order.id,
          shopping_mall_customer_id: customer.id,
          reason: cancellationReason,
          status: "pending",
          requested_at: now,
          processed_at: null,
          created_at: now,
          updated_at: now,
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);

  // Business validations
  TestValidator.equals(
    "cancellation request linked to correct order",
    cancellationRequest.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "cancellation request linked to correct customer",
    cancellationRequest.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "cancellation request reason matches",
    cancellationRequest.reason,
    cancellationReason,
  );
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
}
