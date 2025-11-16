import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentTrackingHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingHistory";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Validates that an authenticated customer can retrieve a specific shipment
 * tracking history event.
 *
 * **Business context**: Shipment tracking enables customers to view the status
 * of their orders during logistics fulfillment. Only the owning customer should
 * be able to access shipment tracking histories for their orders; cross-user or
 * unauthorized access must be denied by business rules. This test sets up the
 * full multi-actor flow so customer access boundaries and event structure are
 * validated.
 *
 * **Flow**:
 *
 * 1. Register a new customer and retain credentials (join)
 * 2. Register a new admin and retain credentials (join)
 * 3. Authenticate as admin; create a new 'active' shipping partner
 * 4. As admin, create a shipment for the customer's (mock) order/order item,
 *    assigning to the shipping partner
 * 5. As admin, append a tracking event to the shipment (realistic values)
 * 6. Switch to customer session
 * 7. Retrieve the tracking event as customer using shipmentId/trackingHistoryId
 * 8. Assert the returned event DTO matches schema and business constraints,
 *    including shipment_id links
 * 9. (Optional) Negative: Cross-user attempts or invalid IDs are not permitted
 *    (not shown in this positive-path flow)
 */
export async function test_api_customer_shipment_tracking_event_retrieval(
  connection: api.IConnection,
) {
  // 1. Register new customer and retain credentials
  const customerPassword = RandomGenerator.alphaNumeric(10);
  const customerEmail = RandomGenerator.alphaNumeric(12) + "@customer.com";
  const customerName = RandomGenerator.name();
  const customerPhone = RandomGenerator.mobile();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword satisfies string as string,
      name: customerName,
      phone: customerPhone,
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customerJoin);

  // 2. Register new admin and retain credentials
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminEmail = RandomGenerator.alphaNumeric(10) + "@admin.com";
  const adminName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword satisfies string as string,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 3. Authenticate as admin (ensure correct actor)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 4. Admin creates new shipping partner
  const shippingPartner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: {
          partner_name: RandomGenerator.name(),
          partner_code: RandomGenerator.alphaNumeric(8),
          status: "active",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallShippingPartner.ICreate,
      },
    );
  typia.assert(shippingPartner);

  // 5. Create a shipment referencing shippingPartner and customer (mock order/order_item references)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const shipment = await api.functional.shoppingMall.admin.shipments.create(
    connection,
    {
      body: {
        order_id: orderId,
        order_item_id: orderItemId,
        shipping_partner_id: shippingPartner.id,
        status: "in_transit",
        created_by_admin_id: adminJoin.id,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);

  // 6. Create a tracking event (admin)
  const trackingEventCreate = {
    event_time: new Date().toISOString(),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    latitude: null,
    longitude: null,
    event_code: "IN_TRANSIT",
    status: "in_transit",
    tracking_message: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallShipmentTrackingHistory.ICreate;
  const trackingEvent =
    await api.functional.shoppingMall.admin.shipments.trackingHistories.create(
      connection,
      {
        shipmentId: shipment.id,
        body: trackingEventCreate,
      },
    );
  typia.assert(trackingEvent);

  // 7. Log in as the customer actor
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://shop.example.com/login",
      referrer: "https://shop.example.com/",
      ip: null,
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 8. Retrieve the specific tracking event as an authenticated customer
  const retrieved =
    await api.functional.shoppingMall.customer.shipments.trackingHistories.at(
      connection,
      {
        shipmentId: shipment.id,
        trackingHistoryId: trackingEvent.id,
      },
    );
  typia.assert(retrieved);
  // 9. Validate event DTO and business links
  TestValidator.equals(
    "tracking event entity id matches trackingEvent",
    retrieved.id,
    trackingEvent.id,
  );
  TestValidator.equals(
    "tracking event shipment id matches shipment",
    retrieved.shipment_id,
    shipment.id,
  );
  TestValidator.equals(
    "tracking event status matches input",
    retrieved.status,
    trackingEventCreate.status,
  );
  TestValidator.equals(
    "tracking event tracking_message matches input",
    retrieved.tracking_message,
    trackingEventCreate.tracking_message,
  );
  TestValidator.equals(
    "tracking event location matches input",
    retrieved.location,
    trackingEventCreate.location,
  );
  TestValidator.equals(
    "tracking event event_code matches input",
    retrieved.event_code,
    trackingEventCreate.event_code,
  );
}
