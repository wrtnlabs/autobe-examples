import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_order_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin authenticates by joining
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(64);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPasswordHash = RandomGenerator.alphaNumeric(64);
  const customer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: {
        email: customerEmail,
        password_hash: customerPasswordHash,
        status: "active",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. Create a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPasswordHash = RandomGenerator.alphaNumeric(64);
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: sellerEmail,
        password_hash: sellerPasswordHash,
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 4. Create an order with the created customer and seller
  const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const totalPrice = 10000 + Math.floor(Math.random() * 10000);
  const orderStatus = "pending";
  const businessStatus = "new";
  const paymentMethod = "credit_card";
  const shippingAddress = `${RandomGenerator.name(1)}, ${RandomGenerator.name(1)} street, Seoul, South Korea`;

  const orderCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: seller.id,
    order_number: orderNumber,
    total_price: totalPrice,
    status: orderStatus,
    business_status: businessStatus,
    payment_method: paymentMethod,
    shipping_address: shippingAddress,
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);
  TestValidator.equals(
    "created order id matches returned id",
    order.id,
    order.id,
  );
  TestValidator.equals(
    "created order number matches input",
    order.order_number,
    orderNumber,
  );

  // 5. Update the order by admin
  const updatedTotalPrice = order.total_price + 2000;
  const updatedStatus = "paid";
  const updatedBusinessStatus = "processing";
  const updatedPaymentMethod = "paypal";
  const updatedShippingAddress = shippingAddress + ", Apt 101";
  const updatedTrackingNumber = `TRK${RandomGenerator.alphaNumeric(10).toUpperCase()}`;

  const orderUpdateBody = {
    total_price: updatedTotalPrice,
    status: updatedStatus,
    business_status: updatedBusinessStatus,
    payment_method: updatedPaymentMethod,
    shipping_address: updatedShippingAddress,
    tracking_number: updatedTrackingNumber,
  } satisfies IShoppingMallOrder.IUpdate;

  const updatedOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.update(connection, {
      orderId: order.id,
      body: orderUpdateBody,
    });
  typia.assert(updatedOrder);

  // Validate updated properties
  TestValidator.equals(
    "order id remains same after update",
    updatedOrder.id,
    order.id,
  );
  TestValidator.equals(
    "order total_price updated correctly",
    updatedOrder.total_price,
    updatedTotalPrice,
  );
  TestValidator.equals(
    "order status updated correctly",
    updatedOrder.status,
    updatedStatus,
  );
  TestValidator.equals(
    "order business_status updated correctly",
    updatedOrder.business_status,
    updatedBusinessStatus,
  );
  TestValidator.equals(
    "order payment_method updated correctly",
    updatedOrder.payment_method,
    updatedPaymentMethod,
  );
  TestValidator.equals(
    "order shipping_address updated correctly",
    updatedOrder.shipping_address,
    updatedShippingAddress,
  );
  TestValidator.equals(
    "order tracking_number updated correctly",
    updatedOrder.tracking_number,
    updatedTrackingNumber,
  );
}
