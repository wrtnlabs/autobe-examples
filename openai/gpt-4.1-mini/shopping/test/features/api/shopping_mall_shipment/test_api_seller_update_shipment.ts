import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

export async function test_api_seller_update_shipment(
  connection: api.IConnection,
) {
  // 1. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "P@ssw0rd!", // realistic password value
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "P@ssw0rd!",
        href: "https://example.com/signup",
        referrer: "https://google.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. Customer creates an order
  const orderNumber = RandomGenerator.alphaNumeric(10);
  const orderStatus = "pending";
  const paymentStatus = "pending";
  const shippingAddress = "123 Example Road, Example City, EX 12345";
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        order_number: orderNumber,
        order_status: orderStatus,
        payment_status: paymentStatus,
        total_amount: 10000, // realistic total amount
        shipping_address: shippingAddress,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 4. Customer creates a shipment linked to the order
  const shipmentStatus = "pending";
  const shipmentCarrier = "DHL";
  const trackingNumber = RandomGenerator.alphaNumeric(12).toUpperCase();
  const shipmentCreateBody = {
    shopping_mall_order_id: order.id,
    shipping_carrier: shipmentCarrier,
    tracking_number: trackingNumber,
    shipment_status: shipmentStatus,
    shipped_at: null,
    delivered_at: null,
  } satisfies IShoppingMallShipment.ICreate;
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.customer.shipments.create(connection, {
      body: shipmentCreateBody,
    });
  typia.assert(shipment);

  // 5. Seller login to set correct auth context
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "P@ssw0rd!",
      ip: null,
      href: "https://example.com/login",
      referrer: "https://google.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 6. Seller updates shipment details
  const updatedCarrier = "FedEx";
  const updatedTrackingNumber = RandomGenerator.alphaNumeric(14).toUpperCase();
  const updatedStatus = "shipped";
  const updatedShippedAt = new Date().toISOString();

  const shipmentUpdateBody = {
    shipping_carrier: updatedCarrier,
    tracking_number: updatedTrackingNumber,
    status: updatedStatus,
    shipped_at: updatedShippedAt,
    delivered_at: null,
  } satisfies IShoppingMallShipment.IUpdate;

  const updatedShipment: IShoppingMallShipment =
    await api.functional.shoppingMall.seller.shipments.update(connection, {
      shipmentId: shipment.id,
      body: shipmentUpdateBody,
    });
  typia.assert(updatedShipment);

  // Validations
  TestValidator.equals("shipment id matches", updatedShipment.id, shipment.id);
  TestValidator.equals(
    "shipment order id matches",
    updatedShipment.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "shipment carrier updated",
    updatedShipment.shipping_carrier,
    updatedCarrier,
  );
  TestValidator.equals(
    "shipment tracking number updated",
    updatedShipment.tracking_number,
    updatedTrackingNumber,
  );
  TestValidator.equals(
    "shipment status updated",
    updatedShipment.status,
    updatedStatus,
  );
  TestValidator.equals(
    "shipment shipped_at updated",
    updatedShipment.shipped_at,
    updatedShippedAt,
  );
  TestValidator.equals(
    "shipment delivered_at is null",
    updatedShipment.delivered_at,
    null,
  );
}
