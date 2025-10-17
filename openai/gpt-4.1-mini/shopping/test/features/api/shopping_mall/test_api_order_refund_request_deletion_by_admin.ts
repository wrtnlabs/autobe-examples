import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * E2E test validating the refund request deletion flow by an admin user.
 *
 * 1. Admin account is created and authenticated.
 * 2. Customer account is created and authenticated.
 * 3. Seller account is created.
 * 4. An order associated with the customer and seller is created.
 * 5. A refund request is created for the order by the customer.
 * 6. The admin deletes the refund request by orderId and refundRequestId.
 *
 * Note: Since refundRequestId is not returned from the creation API and no
 * retrieval API is provided, a simulated UUID is used for deletion.
 */
export async function test_api_order_refund_request_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = "StrongPass123!";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Customer registration and authentication for order/refund creation
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustPass123!";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. Seller account creation
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPasswordHash = "SellerPass123!";
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: sellerEmail,
        password_hash: sellerPasswordHash,
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 4. Create an order linked to the customer and seller
  const orderNumber = `ORD-${Date.now()}`;
  const orderTotalPrice = 12345.67;
  const orderStatus = "Pending";
  const businessStatus = "Processing";
  const paymentMethod = "CreditCard";
  const shippingAddress = "123 Example St, Seoul, South Korea";

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: seller.id,
        order_number: orderNumber,
        total_price: orderTotalPrice,
        status: orderStatus,
        business_status: businessStatus,
        payment_method: paymentMethod,
        shipping_address: shippingAddress,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 5. Create a refund request for the above order
  const refundReason = `Refund requested for order ${order.order_number}`;
  const refundAmount = 100.0;
  const refundStatus: "Pending" = "Pending";
  const requestedAt = new Date().toISOString();

  await api.functional.shoppingMall.customer.orders.refundRequests.createRefundRequest(
    connection,
    {
      orderId: order.id,
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_customer_id: customer.id,
        reason: refundReason,
        refund_amount: refundAmount,
        status: refundStatus,
        requested_at: requestedAt,
      } satisfies IShoppingMallRefundRequest.ICreate,
    },
  );

  // 6. Admin deletes the refund request
  // Note: refundRequestId is not provided by the refund request creation API nor can it be fetched.
  // Simulate refundRequestId as a fresh UUID for deletion.
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.shoppingMall.admin.orders.refundRequests.eraseRefundRequest(
    connection,
    {
      orderId: order.id,
      refundRequestId: refundRequestId,
    },
  );
}
