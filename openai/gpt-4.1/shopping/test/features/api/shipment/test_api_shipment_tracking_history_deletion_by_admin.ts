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
 * Test full deletion of shipment tracking histories by admin.
 *
 * 1. Register and authenticate as admin
 * 2. Create a shipping partner as admin
 * 3. Construct correct summary objects for order, order item, and shipping partner
 * 4. Create a shipment as admin that references these summaries
 * 5. Create a tracking history event for the shipment
 * 6. Delete the tracking history event using the admin erase endpoint
 * 7. Attempt to delete the same tracking history event again to confirm it is
 *    truly deleted (should receive an error)
 * 8. The audit trail remains consistent according to deletion rules
 */
export async function test_api_shipment_tracking_history_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin (admin join sets Authorization header)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Create a shipping partner
  const shippingPartnerBody = {
    partner_name: RandomGenerator.name(),
    partner_code: RandomGenerator.alphaNumeric(8),
    status: RandomGenerator.pick(["active", "inactive", "deprecated"] as const),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingMallShippingPartner.ICreate;
  const shippingPartner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: shippingPartnerBody,
      },
    );
  typia.assert(shippingPartner);

  // 3. Prepare fake summaries for order and order item (since we have no order creation function in scope)
  // Normally these would be created from successful order flows, but here use random values/type compliance
  const orderSummary: IShoppingMallOrder.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    order_number: RandomGenerator.alphaNumeric(12),
    status: "pending",
    total_amount: 12345,
    currency: "KRW",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  const productSkuSummary: IShoppingMallProductSku.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    code: RandomGenerator.alphaNumeric(8),
    product_title: RandomGenerator.paragraph({ sentences: 2 }),
    option_summary: RandomGenerator.paragraph({ sentences: 2 }),
    in_stock: true,
  };
  const orderItemSummary: IShoppingMallOrderItem.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_id: orderSummary.id,
    sku: productSkuSummary,
    quantity: 2,
    unit_price: 10000,
    subtotal: 20000,
    currency: "KRW",
    delivered: false,
    refunded: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const shippingPartnerSummary: IShoppingMallShippingPartner.ISummary = {
    id: shippingPartner.id,
    partner_name: shippingPartner.partner_name,
    partner_code: shippingPartner.partner_code,
    status: shippingPartner.status,
    description: shippingPartner.description,
    created_at: shippingPartner.created_at,
    updated_at: shippingPartner.updated_at,
    deleted_at: shippingPartner.deleted_at,
  };

  // 4. Create a shipment as admin referencing these summaries
  const shipmentBody = {
    order_id: orderSummary.id,
    order_item_id: orderItemSummary.id,
    shipping_partner_id: shippingPartnerSummary.id,
    carrier_tracking_code: RandomGenerator.alphaNumeric(10),
    status: RandomGenerator.pick([
      "pending",
      "ready",
      "picked_up",
      "in_transit",
      "delivered",
      "cancelled",
      "returned",
    ] as const),
    manifest_url: null,
    provider_response_code: null,
    created_by_admin_id: admin.id,
    created_by_seller_id: null,
  } satisfies IShoppingMallShipment.ICreate;
  const shipment = await api.functional.shoppingMall.admin.shipments.create(
    connection,
    {
      body: shipmentBody,
    },
  );
  typia.assert(shipment);

  // 5. Append a tracking history event for the shipment
  const trackingHistoryBody = {
    event_time: new Date().toISOString(),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    latitude: 37.5665,
    longitude: 126.978,
    event_code: RandomGenerator.pick([
      "OUT_FOR_DELIVERY",
      "ARRIVED",
      "DELIVERED",
    ] as const),
    status: RandomGenerator.pick([
      "pending",
      "in_transit",
      "delivered",
      "exception",
      "returned",
    ] as const),
    tracking_message: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallShipmentTrackingHistory.ICreate;
  const trackingHistory =
    await api.functional.shoppingMall.admin.shipments.trackingHistories.create(
      connection,
      {
        shipmentId: shipment.id,
        body: trackingHistoryBody,
      },
    );
  typia.assert(trackingHistory);
  TestValidator.equals(
    "tracking event is linked to correct shipment",
    trackingHistory.shipment_id,
    shipment.id,
  );

  // 6. Delete that specific tracking history event via the erase endpoint
  await api.functional.shoppingMall.admin.shipments.trackingHistories.erase(
    connection,
    {
      shipmentId: shipment.id,
      trackingHistoryId: trackingHistory.id,
    },
  );

  // 7. Confirm deletion is permanent by attempting to delete again (should fail)
  await TestValidator.error(
    "Deleting already deleted tracking event should fail",
    async () => {
      await api.functional.shoppingMall.admin.shipments.trackingHistories.erase(
        connection,
        {
          shipmentId: shipment.id,
          trackingHistoryId: trackingHistory.id,
        },
      );
    },
  );
}
