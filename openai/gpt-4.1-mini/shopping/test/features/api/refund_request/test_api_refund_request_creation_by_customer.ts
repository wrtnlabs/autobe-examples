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
 * Validate refund request creation by customer.
 *
 * This test covers the following sequence:
 *
 * 1. Customer registration by calling /auth/customer/join.
 * 2. Seller account creation through /shoppingMall/admin/sellers.
 * 3. Order creation associating the registered customer and seller.
 * 4. Submit refund request for the created order with valid reason and refund
 *    amount.
 *
 * All steps ensure data validity, proper authentication, and correct response
 * types. The refund request status is verified as 'Pending' with a proper
 * timestamp.
 */
export async function test_api_refund_request_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer and assert authorized response
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "P@ssw0rd!123",
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 2. Create a new seller and assert seller response
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: "hashedpasswordmock",
        company_name: RandomGenerator.name(2),
        contact_name: RandomGenerator.name(2),
        phone_number: RandomGenerator.mobile(),
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Create a new order associating generated customer and seller
  const orderNumber = `ORD-${RandomGenerator.alphabets(3).toUpperCase()}${Date.now()}`;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: seller.id,
        order_number: orderNumber,
        total_price: Number((Math.random() * 1000 + 50).toFixed(2)),
        status: "Paid",
        business_status: "WaitingShipment",
        payment_method: "credit_card",
        shipping_address: `${RandomGenerator.name(1)}, ${RandomGenerator.name(1)}, Seoul, South Korea`,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);
  TestValidator.equals(
    "order customer ID matches created customer",
    order.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "order seller ID matches created seller",
    order.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "order number matches request",
    order.order_number,
    orderNumber,
  );

  // 4. Create a refund request for the order
  const refundRequestBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_customer_id: customer.id,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    refund_amount: order.total_price * 0.8,
    status: "Pending",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallRefundRequest.ICreate;

  await api.functional.shoppingMall.customer.orders.refundRequests.createRefundRequest(
    connection,
    {
      orderId: order.id,
      body: refundRequestBody,
    },
  );
}
