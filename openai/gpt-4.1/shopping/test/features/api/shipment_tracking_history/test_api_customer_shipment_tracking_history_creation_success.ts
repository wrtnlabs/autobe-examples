import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipmentTrackingHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingHistory";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Validates that a customer can successfully add a shipment tracking history
 * record to a shipment belonging to their order.
 *
 * This scenario simulates the end-to-end workflow:
 *
 * 1. Register admin and login as admin
 * 2. Admin creates a shipping partner
 * 3. Register seller, login as seller
 * 4. Seller creates a shipment for an order (mock order number is generated for
 *    the scenario)
 * 5. Register customer, login as customer
 * 6. Customer adds a tracking history event to their shipment
 *
 * Test ensures correct attribution, timestamps, and linkage between shipment
 * and tracking history, as well as business logic compliance for required
 * fields.
 */
export async function test_api_customer_shipment_tracking_history_creation_success(
  connection: api.IConnection,
) {
  // 1. Register and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 2. Admin creates a shipping partner
  const shippingPartnerBody = {
    partner_name: RandomGenerator.name(),
    partner_code: RandomGenerator.alphaNumeric(7),
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallShippingPartner.ICreate;
  const shippingPartner: IShoppingMallShippingPartner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: shippingPartnerBody,
      },
    );
  typia.assert(shippingPartner);

  // 3. Register and login as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPass123!";
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        business_name: RandomGenerator.name(),
        registration_number: RandomGenerator.alphaNumeric(10),
        business_phone: RandomGenerator.mobile(),
        href: "https://shop.example.com/register",
        referrer: "https://shop.example.com/landing",
        ip: "127.0.0.1",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/",
      ip: "127.0.0.1",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 4. Seller creates a shipment for a mocked order
  const mockOrderNumber = RandomGenerator.alphaNumeric(12);
  const shipmentBody = {
    shipping_partner_id: shippingPartner.id,
    tracking_number: RandomGenerator.alphaNumeric(15),
    status: "pending",
    ship_date: new Date().toISOString(),
    expected_delivery_date: new Date(
      Date.now() + 7 * 24 * 3600 * 1000,
    ).toISOString(), // 7 days later
  } satisfies IShoppingMallOrderShipment.ICreate;
  const shipment: IShoppingMallOrderShipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      connection,
      {
        orderNumber: mockOrderNumber,
        body: shipmentBody,
      },
    );
  typia.assert(shipment);

  // 5. Register and login as customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPass123!";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 6. Customer adds tracking history event to the shipment
  const trackingEventBody = {
    event_time: new Date().toISOString(),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    status: "in_transit",
    tracking_message: RandomGenerator.paragraph({ sentences: 6 }),
    latitude: 37.5665,
    longitude: 126.978,
    event_code: "OUT_FOR_DELIVERY",
  } satisfies IShoppingMallShipmentTrackingHistory.ICreate;
  const trackingHistory: IShoppingMallShipmentTrackingHistory =
    await api.functional.shoppingMall.customer.shipments.trackingHistories.create(
      connection,
      {
        shipmentId: shipment.id,
        body: trackingEventBody,
      },
    );
  typia.assert(trackingHistory);

  // Assertions
  TestValidator.equals(
    "tracking history shipment linkage",
    trackingHistory.shipment_id,
    shipment.id,
  );
  TestValidator.equals(
    "tracking history status",
    trackingHistory.status,
    trackingEventBody.status,
  );
  TestValidator.equals(
    "tracking history tracking_message",
    trackingHistory.tracking_message,
    trackingEventBody.tracking_message,
  );
  TestValidator.equals(
    "tracking history event_time",
    trackingHistory.event_time,
    trackingEventBody.event_time,
  );
  TestValidator.equals(
    "tracking history event_code",
    trackingHistory.event_code,
    trackingEventBody.event_code,
  );
  TestValidator.equals(
    "tracking history location",
    trackingHistory.location,
    trackingEventBody.location,
  );
  TestValidator.equals(
    "tracking history latitude",
    trackingHistory.latitude,
    trackingEventBody.latitude,
  );
  TestValidator.equals(
    "tracking history longitude",
    trackingHistory.longitude,
    trackingEventBody.longitude,
  );
}
