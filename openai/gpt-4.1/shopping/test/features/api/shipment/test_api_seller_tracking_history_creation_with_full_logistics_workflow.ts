import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipmentTrackingHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingHistory";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Test the full logistics workflow: seller and admin registration, shipping
 * partner creation, order shipment creation, and tracking history event
 * journaling.
 *
 * This test follows these steps:
 *
 * 1. Register an admin account and log in to obtain admin privileges (needed to
 *    register a shipping partner).
 * 2. Register a seller account and log in as the seller (needed for seller flows).
 * 3. Create a new shipping partner as admin.
 * 4. As seller, create a new order shipment referencing the shipping partner,
 *    using a simulated business order number.
 * 5. As seller, register a tracking history event for the created shipment.
 * 6. Validate all authentication, schema, reference, status/event, and attribute
 *    propagation logic throughout the business workflow.
 */
export async function test_api_seller_tracking_history_creation_with_full_logistics_workflow(
  connection: api.IConnection,
) {
  // 1. Register admin and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name(2);
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminAuth);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 2. Register seller and login as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerBusinessName = RandomGenerator.name(2);
  const sellerRegistrationNumber = RandomGenerator.alphaNumeric(12);
  const sellerPhone = RandomGenerator.mobile();
  const sellerHref = `https://seller.test/${typia.random<string & tags.Format<"uuid">>()}`;
  const sellerReferrer = `https://landing.test/${typia.random<string & tags.Format<"uuid">>()}`;
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: sellerBusinessName,
      registration_number: sellerRegistrationNumber,
      business_phone: sellerPhone,
      href: sellerHref,
      referrer: sellerReferrer,
      ip: null,
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
      ip: null,
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 3. As admin, create a shipping partner
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const shippingPartnerName = `Partner ${RandomGenerator.name(2)}`;
  const shippingPartnerCode = RandomGenerator.alphaNumeric(8);
  const shippingPartnerStatus = "active";
  const shippingPartnerDescription = RandomGenerator.paragraph({
    sentences: 3,
  });
  const partner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: {
          partner_name: shippingPartnerName,
          partner_code: shippingPartnerCode,
          status: shippingPartnerStatus,
          description: shippingPartnerDescription,
        } satisfies IShoppingMallShippingPartner.ICreate,
      },
    );
  typia.assert(partner);

  // 4. Switch back to seller and create a shipment for a simulated order number
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
      ip: null,
    } satisfies IShoppingMallSeller.ILogin,
  });
  const orderNumber = `ORD${RandomGenerator.alphaNumeric(9).toUpperCase()}`;
  const shipmentTrackingNumber = RandomGenerator.alphaNumeric(14).toUpperCase();
  const initialStatus = "pending";
  const shipDate = new Date().toISOString();
  const shipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      connection,
      {
        orderNumber: orderNumber,
        body: {
          shipping_partner_id: partner.id,
          tracking_number: shipmentTrackingNumber,
          status: initialStatus,
          ship_date: shipDate,
          expected_delivery_date: null,
        } satisfies IShoppingMallOrderShipment.ICreate,
      },
    );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment status is pending",
    shipment.status,
    initialStatus,
  );
  TestValidator.equals(
    "shipment shipping partner id",
    shipment.shippingPartner.id,
    partner.id,
  );
  TestValidator.equals(
    "shipment tracking number",
    shipment.tracking_number,
    shipmentTrackingNumber,
  );

  // 5. Register a tracking history event on the shipment
  const eventTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // +1 hour
  const trackingStatus = "in_transit";
  const eventCode = "OUT_FOR_DELIVERY";
  const eventLocation = RandomGenerator.paragraph({ sentences: 2 });
  const eventMessage = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 6,
    sentenceMax: 10,
  });
  const trackingHistory =
    await api.functional.shoppingMall.seller.shipments.trackingHistories.create(
      connection,
      {
        shipmentId: shipment.id,
        body: {
          event_time: eventTime,
          status: trackingStatus,
          event_code: eventCode,
          location: eventLocation,
          tracking_message: eventMessage,
        } satisfies IShoppingMallShipmentTrackingHistory.ICreate,
      },
    );
  typia.assert(trackingHistory);
  TestValidator.equals(
    "tracking event shipment_id",
    trackingHistory.shipment_id,
    shipment.id,
  );
  TestValidator.equals(
    "tracking status",
    trackingHistory.status,
    trackingStatus,
  );
  TestValidator.equals(
    "tracking message",
    trackingHistory.tracking_message,
    eventMessage,
  );
  TestValidator.equals(
    "tracking event_code",
    trackingHistory.event_code,
    eventCode,
  );
  TestValidator.equals(
    "tracking location",
    trackingHistory.location,
    eventLocation,
  );
  TestValidator.equals(
    "tracking event_time",
    trackingHistory.event_time,
    eventTime,
  );

  // 6. Auth boundary: tracking journaling fails if seller is not logged in
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  await TestValidator.error(
    "tracking journaling fails for non-seller actor",
    async () => {
      await api.functional.shoppingMall.seller.shipments.trackingHistories.create(
        connection,
        {
          shipmentId: shipment.id,
          body: {
            event_time: new Date(Date.now() + 7200 * 1000).toISOString(),
            status: trackingStatus,
            event_code: eventCode,
            location: RandomGenerator.paragraph({ sentences: 1 }),
            tracking_message: RandomGenerator.content({ paragraphs: 1 }),
          } satisfies IShoppingMallShipmentTrackingHistory.ICreate,
        },
      );
    },
  );
}
