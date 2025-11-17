import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

export async function test_api_seller_delete_shipment(
  connection: api.IConnection,
) {
  // Step 1: Seller joins and authenticates
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "securePassword123",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Customer joins and authenticates
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "securePassword123",
        href: "https://example.com/signup",
        referrer: "https://google.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 3: Customer creates a new order
  const orderNumber = RandomGenerator.alphaNumeric(12);
  const orderStatus = "pending";
  const paymentStatus = "pending";
  const totalAmount = Math.floor(Math.random() * 10000) + 1000; // 1000-10999
  const shippingAddress = "123 Test Street, Test City, Test Country";

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        order_number: orderNumber,
        order_status: orderStatus,
        payment_status: paymentStatus,
        total_amount: totalAmount,
        shipping_address: shippingAddress,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // Step 4: Customer creates shipment associated to the order
  const shipmentStatus = "pending";
  const shippingCarrier = "FastShip";
  const trackingNumber = RandomGenerator.alphaNumeric(10);
  const shippedAt = null;
  const deliveredAt = null;

  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.customer.shipments.create(connection, {
      body: {
        shopping_mall_order_id: order.id,
        shipping_carrier: shippingCarrier,
        tracking_number: trackingNumber,
        shipment_status: shipmentStatus,
        shipped_at: shippedAt,
        delivered_at: deliveredAt,
      } satisfies IShoppingMallShipment.ICreate,
    });
  typia.assert(shipment);

  // Step 5: Seller re-authenticates to simulate actor switching
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "securePassword123",
      href: "https://example.com/login",
      referrer: "https://google.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 6: Seller deletes the shipment
  await api.functional.shoppingMall.seller.shipments.erase(connection, {
    shipmentId: shipment.id,
  });

  // Step 7: Verify error when deleting the already deleted shipment
  await TestValidator.error(
    "deleting already deleted shipment should fail",
    async () => {
      await api.functional.shoppingMall.seller.shipments.erase(connection, {
        shipmentId: shipment.id,
      });
    },
  );
}
