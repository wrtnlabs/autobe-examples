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
 * Validate the strict admin workflow for creation of a shipment tracking
 * history entry through the admin-tracking API, enforcing business rules and
 * audit trails.
 *
 * This test verifies:
 *
 * 1. Registering and authenticating a new admin
 * 2. Registering a new shipping partner as that admin
 * 3. Creating a shipment attributed to the admin (mocking order and item)
 * 4. Appending a new tracking history event as admin via the proper endpoint
 * 5. That business rules and all relevant linkages are enforced (actor, audit
 *    trail, shipment/tracking/partner relations, required timestamps)
 *
 * Steps:
 *
 * 1. Register a platform admin (auth.admin.join)
 * 2. Register a platform shipping partner (admin.shippingPartners.create)
 * 3. Mock new order and order item summary, as required for shipment (with random
 *    uuid, currency)
 * 4. Create the shipment as the admin, referring to all entities properly
 * 5. Create a shipment tracking history event for the shipment, as the admin
 * 6. Validate all properties, relationships, and actor fields in the API responses
 */
export async function test_api_admin_tracking_history_creation_with_strict_admin_workflow(
  connection: api.IConnection,
) {
  // 1. Register admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals(
    "Registered admin email matches",
    admin.email,
    adminEmail,
  );

  // 2. Register a platform shipping partner (linked to shipment)
  const partnerInput = {
    partner_name: RandomGenerator.name(2),
    partner_code: RandomGenerator.alphaNumeric(10),
    status: "active",
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallShippingPartner.ICreate;
  const partner: IShoppingMallShippingPartner =
    await api.functional.shoppingMall.admin.shippingPartners.create(
      connection,
      {
        body: partnerInput,
      },
    );
  typia.assert(partner);
  TestValidator.equals(
    "Shipping partner name matches input",
    partner.partner_name,
    partnerInput.partner_name,
  );
  TestValidator.equals(
    "Shipping partner code matches input",
    partner.partner_code,
    partnerInput.partner_code,
  );
  TestValidator.equals("Shipping partner is active", partner.status, "active");

  // 3. Mock order summary and order item summary - minimal fields to construct shipment
  const orderSummary: IShoppingMallOrder.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    order_number: RandomGenerator.alphaNumeric(12),
    status: "paid",
    total_amount: 9900,
    currency: "KRW",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  const orderItemSummary: IShoppingMallOrderItem.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_id: orderSummary.id,
    sku: {
      id: typia.random<string & tags.Format<"uuid">>(),
      code: RandomGenerator.alphaNumeric(10),
      product_title: RandomGenerator.name(2),
      option_summary: RandomGenerator.paragraph({ sentences: 2 }),
      in_stock: true,
    },
    quantity: 1,
    unit_price: 9900,
    subtotal: 9900,
    currency: "KRW",
    delivered: false,
    refunded: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 4. Create a shipment as admin
  const shipmentInput = {
    // all IDs as required by ICreate
    order_id: orderSummary.id,
    order_item_id: orderItemSummary.id,
    shipping_partner_id: partner.id,
    carrier_tracking_code: RandomGenerator.alphaNumeric(14),
    status: "pending",
    manifest_url: null,
    provider_response_code: null,
    created_by_admin_id: admin.id,
    created_by_seller_id: null,
  } satisfies IShoppingMallShipment.ICreate;
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.shipments.create(connection, {
      body: shipmentInput,
    });
  typia.assert(shipment);
  TestValidator.equals(
    "Shipment's order ID matches",
    shipment.order.id,
    orderSummary.id,
  );
  TestValidator.equals(
    "Shipment's shipping partner ID matches",
    shipment.shippingPartner.id,
    partner.id,
  );
  TestValidator.equals(
    "Shipment actor is the correct admin",
    shipment.createdByAdmin?.id,
    admin.id,
  );
  TestValidator.equals(
    "Shipment status is 'pending'",
    shipment.status,
    "pending",
  );
  TestValidator.equals(
    "Shipment carrier_tracking_code matches",
    shipment.carrier_tracking_code,
    shipmentInput.carrier_tracking_code,
  );

  // 5. Create shipment tracking history event for shipment as admin
  const eventTime = new Date().toISOString();
  const trackingInput = {
    event_time: eventTime,
    location: RandomGenerator.paragraph({ sentences: 1 }),
    latitude: null,
    longitude: null,
    event_code: RandomGenerator.alphaNumeric(6),
    status: "in_transit",
    tracking_message: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallShipmentTrackingHistory.ICreate;
  const tracking: IShoppingMallShipmentTrackingHistory =
    await api.functional.shoppingMall.admin.shipments.trackingHistories.create(
      connection,
      {
        shipmentId: shipment.id,
        body: trackingInput,
      },
    );
  typia.assert(tracking);
  TestValidator.equals(
    "Tracking event shipment_id matches",
    tracking.shipment_id,
    shipment.id,
  );
  TestValidator.equals(
    "Tracking event_time matches input",
    tracking.event_time,
    eventTime,
  );
  TestValidator.equals(
    "Tracking status is 'in_transit'",
    tracking.status,
    "in_transit",
  );
  TestValidator.equals(
    "Tracking tracking_message matches input",
    tracking.tracking_message,
    trackingInput.tracking_message,
  );
}
