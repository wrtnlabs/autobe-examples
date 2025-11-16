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
 * Validates admin ability to update an existing shipment tracking history
 * record administratively.
 *
 * Full workflow:
 *
 * 1. Admin joins and authenticates
 * 2. Admin creates a new shipping partner
 * 3. Admin creates a new shipment
 * 4. Admin appends a new tracking history record to the shipment
 * 5. Admin updates the tracking history via the API
 * 6. Validate all mutable fields were updated, status/state is as expected, and
 *    entity referential integrity is preserved.
 */
export async function test_api_shipment_tracking_history_update_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      name: adminName,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Admin creates a new shipping partner
  const partnerBody = {
    partner_name: RandomGenerator.name(2),
    partner_code: RandomGenerator.alphaNumeric(10),
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingMallShippingPartner.ICreate;
  const shippingPartner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      { body: partnerBody },
    );
  typia.assert(shippingPartner);

  // 3. Create a fake order and order item for shipment linkage (simulate realistic ids)
  const order: IShoppingMallOrder.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    order_number: RandomGenerator.alphaNumeric(8),
    status: "pending",
    total_amount: 10000,
    currency: "KRW",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  const sku: IShoppingMallProductSku.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    code: RandomGenerator.alphaNumeric(10),
    product_title: RandomGenerator.name(2),
    option_summary: RandomGenerator.name(1),
    in_stock: true,
  };
  const orderItem: IShoppingMallOrderItem.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_id: order.id,
    sku,
    quantity: 1,
    unit_price: 10000,
    subtotal: 10000,
    currency: "KRW",
    delivered: false,
    refunded: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 4. Admin creates a new shipment
  const shipmentBody = {
    order_id: order.id,
    order_item_id: orderItem.id,
    shipping_partner_id: shippingPartner.id,
    carrier_tracking_code: RandomGenerator.alphaNumeric(12),
    status: "pending",
    manifest_url: null,
    provider_response_code: null,
    created_by_admin_id: admin.id,
    created_by_seller_id: null,
  } satisfies IShoppingMallShipment.ICreate;
  const shipment = await api.functional.shoppingMall.admin.shipments.create(
    connection,
    { body: shipmentBody },
  );
  typia.assert(shipment);

  // 5. Admin creates initial shipment tracking history
  const initialHistoryBody = {
    event_time: new Date(Date.now() - 10000).toISOString(),
    location: "Warehouse",
    latitude: 37.5665,
    longitude: 126.978,
    event_code: "INBOUND",
    status: "pending",
    tracking_message: "Shipment received at warehouse",
  } satisfies IShoppingMallShipmentTrackingHistory.ICreate;
  const trackingHistory =
    await api.functional.shoppingMall.admin.shipments.trackingHistories.create(
      connection,
      {
        shipmentId: shipment.id,
        body: initialHistoryBody,
      },
    );
  typia.assert(trackingHistory);

  // 6. Admin updates the tracking history with new data
  const event_time_update = new Date().toISOString();
  const updatedHistoryBody = {
    event_time: event_time_update,
    location: "Transit Hub",
    latitude: 36.3504,
    longitude: 127.3845,
    event_code: "DEPARTED",
    status: "in_transit",
    tracking_message: "Shipment departed warehouse and is in transit.",
  } satisfies IShoppingMallShipmentTrackingHistory.IUpdate;
  const updatedTrackingHistory =
    await api.functional.shoppingMall.admin.shipments.trackingHistories.update(
      connection,
      {
        shipmentId: shipment.id,
        trackingHistoryId: trackingHistory.id,
        body: updatedHistoryBody,
      },
    );
  typia.assert(updatedTrackingHistory);

  // 7. Validate update is reflected
  TestValidator.equals(
    "tracking history id preserved",
    updatedTrackingHistory.id,
    trackingHistory.id,
  );
  TestValidator.equals(
    "shipment linkage preserved",
    updatedTrackingHistory.shipment_id,
    shipment.id,
  );
  TestValidator.equals(
    "event_time updated",
    updatedTrackingHistory.event_time,
    event_time_update,
  );
  TestValidator.equals(
    "location updated",
    updatedTrackingHistory.location,
    "Transit Hub",
  );
  TestValidator.equals(
    "latitude updated",
    updatedTrackingHistory.latitude,
    36.3504,
  );
  TestValidator.equals(
    "longitude updated",
    updatedTrackingHistory.longitude,
    127.3845,
  );
  TestValidator.equals(
    "event_code updated",
    updatedTrackingHistory.event_code,
    "DEPARTED",
  );
  TestValidator.equals(
    "status updated",
    updatedTrackingHistory.status,
    "in_transit",
  );
  TestValidator.equals(
    "tracking_message updated",
    updatedTrackingHistory.tracking_message,
    "Shipment departed warehouse and is in transit.",
  );
}
