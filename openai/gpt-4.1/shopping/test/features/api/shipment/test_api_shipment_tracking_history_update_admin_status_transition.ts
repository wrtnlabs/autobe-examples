import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentTrackingHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingHistory";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Test a status transition in shipment tracking history by an admin.
 *
 * 1. Create a new admin account.
 * 2. Create a new shipping partner.
 * 3. Create a new shipment with 'in_transit' status.
 * 4. Register a shipment tracking history entry with status 'in_transit'.
 * 5. Transition tracking status to 'delivered' via update and validate.
 * 6. Attempt an invalid status transition to 'unknown_status' and expect failure.
 */
export async function test_api_shipment_tracking_history_update_admin_status_transition(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Shipping partner creation
  const partner: IShoppingMallShippingPartner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: {
          partner_name: RandomGenerator.paragraph({ sentences: 2 }),
          partner_code: RandomGenerator.alphaNumeric(8),
          status: "active",
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IShoppingMallShippingPartner.ICreate,
      },
    );
  typia.assert(partner);

  // 3. Shipment creation
  const dummyOrderId = typia.random<string & tags.Format<"uuid">>();
  const dummyOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.shipments.create(connection, {
      body: {
        order_id: dummyOrderId,
        order_item_id: dummyOrderItemId,
        shipping_partner_id: partner.id,
        status: "in_transit",
        carrier_tracking_code: RandomGenerator.alphaNumeric(16),
        manifest_url: null,
        provider_response_code: null,
        created_by_admin_id: admin.id,
        created_by_seller_id: undefined,
      } satisfies IShoppingMallShipment.ICreate,
    });
  typia.assert(shipment);
  TestValidator.equals(
    "shipment partner ID",
    shipment.shippingPartner.id,
    partner.id,
  );
  TestValidator.equals(
    "shipment status is in_transit",
    shipment.status,
    "in_transit",
  );

  // 4. Create a tracking history with status 'in_transit'
  const inTransitTime = new Date().toISOString();
  const trackingEvent: IShoppingMallShipmentTrackingHistory =
    await api.functional.shoppingMall.admin.shipments.trackingHistories.create(
      connection,
      {
        shipmentId: shipment.id,
        body: {
          event_time: inTransitTime,
          location: RandomGenerator.paragraph({ sentences: 1 }),
          latitude: null,
          longitude: null,
          event_code: "OUT_FOR_DELIVERY",
          status: "in_transit",
          tracking_message: "Shipment has departed the facility.",
        } satisfies IShoppingMallShipmentTrackingHistory.ICreate,
      },
    );
  typia.assert(trackingEvent);
  TestValidator.equals(
    "tracking history status is in_transit",
    trackingEvent.status,
    "in_transit",
  );

  // 5. Update the tracking event status to 'delivered'
  const deliveredTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // +1 hour
  const updatedTracking: IShoppingMallShipmentTrackingHistory =
    await api.functional.shoppingMall.admin.shipments.trackingHistories.update(
      connection,
      {
        shipmentId: shipment.id,
        trackingHistoryId: trackingEvent.id,
        body: {
          event_time: deliveredTime,
          status: "delivered",
          tracking_message: "Package delivered to recipient.",
          event_code: "DELIVERED",
        } satisfies IShoppingMallShipmentTrackingHistory.IUpdate,
      },
    );
  typia.assert(updatedTracking);
  TestValidator.equals(
    "updated tracking status is delivered",
    updatedTracking.status,
    "delivered",
  );
  TestValidator.equals(
    "updated event_time",
    updatedTracking.event_time,
    deliveredTime,
  );
  TestValidator.equals(
    "tracking message updated",
    updatedTracking.tracking_message,
    "Package delivered to recipient.",
  );

  // 6. Attempt to update with invalid status and expect validation error
  await TestValidator.error(
    "invalid status code should be rejected",
    async () => {
      await api.functional.shoppingMall.admin.shipments.trackingHistories.update(
        connection,
        {
          shipmentId: shipment.id,
          trackingHistoryId: trackingEvent.id,
          body: {
            status: "unknown_status",
          } satisfies IShoppingMallShipmentTrackingHistory.IUpdate,
        },
      );
    },
  );
}
