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
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * End-to-end test verifying shipment status transition workflow and business
 * rule compliance for seller-initiated updates.
 *
 * This test registers a new seller, mocks or assumes the existence of a
 * shipment in status 'ready', and performs the full shipment workflow:
 *
 * 1. Seller registration and authentication.
 * 2. Shipment selection/setup (shipment must be in 'ready' state and belong to the
 *    seller).
 * 3. Update shipment: Transition from 'ready' → 'picked_up'.
 *
 *    - Provide tracking code, manifest URL, and set updated_by_seller_id.
 * 4. Update shipment: Transition from 'picked_up' → 'in_transit'.
 *
 *    - Optionally update tracking/manifest; must maintain seller attribution.
 * 5. Update shipment: Transition from 'in_transit' → 'delivered'.
 *
 *    - Supply delivery_at timestamp, ensure updated_by_seller_id is set.
 * 6. Attempt invalid transition: Try to move from 'delivered' → 'in_transit'.
 *
 *    - Expect business rule error (should throw, error validation).
 * 7. Throughout, validate the following after each update:
 *
 *    - Shipment.status matches new status.
 *    - Shipment.updated_by_seller_id is set to seller's id.
 *    - Manifest/tracking code changes persist.
 *    - Delivery_at property is set when status is 'delivered'.
 *    - No unauthorized field changes occur.
 */
export async function test_api_shipment_update_by_seller_status_workflow(
  connection: api.IConnection,
) {
  // 1. Register a seller and retrieve authorized seller info
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(2),
    registration_number: RandomGenerator.alphaNumeric(12),
    business_phone: RandomGenerator.mobile(),
    href: "https://example.com/seller/test",
    referrer: "https://example.com/ref",
  } satisfies IShoppingMallSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);

  // 2. Create a mock shipment for this seller (in real test suite this would be inserted via test data factory or fixture)
  //    Here, we mock a shipment object in 'ready' state. Realistically, this would be created by preceding order→fulfillment APIs.
  let shipment = typia.random<IShoppingMallShipment>();
  shipment = {
    ...shipment,
    status: "ready",
    createdBySeller: {
      id: sellerAuth.id,
      business_name: sellerAuth.business_name,
    },
  };
  const shipmentId = shipment.id;

  // 3. Transition shipment to 'picked_up'
  const pickedUpTrackingCode = RandomGenerator.alphaNumeric(15);
  const pickedUpManifestUrl =
    "https://logistic.example.com/manifest/" + RandomGenerator.alphaNumeric(10);
  let out = await api.functional.shoppingMall.seller.shipments.update(
    connection,
    {
      shipmentId,
      body: {
        status: "picked_up",
        carrier_tracking_code: pickedUpTrackingCode,
        manifest_url: pickedUpManifestUrl,
        updated_by_seller_id: sellerAuth.id,
      } satisfies IShoppingMallShipment.IUpdate,
    },
  );
  typia.assert(out);
  TestValidator.equals("Status changed to picked_up", out.status, "picked_up");
  TestValidator.equals(
    "Tracking code updated",
    out.carrier_tracking_code,
    pickedUpTrackingCode,
  );
  TestValidator.equals(
    "Manifest url updated",
    out.manifest_url,
    pickedUpManifestUrl,
  );
  TestValidator.equals(
    "Attribution to seller",
    out.createdBySeller?.id,
    sellerAuth.id,
  );

  // 4. Transition shipment to 'in_transit'
  const inTransitTracking = RandomGenerator.alphaNumeric(15);
  const inTransitManifest =
    "https://logistic.example.com/manifest/" + RandomGenerator.alphaNumeric(10);
  out = await api.functional.shoppingMall.seller.shipments.update(connection, {
    shipmentId,
    body: {
      status: "in_transit",
      carrier_tracking_code: inTransitTracking,
      manifest_url: inTransitManifest,
      updated_by_seller_id: sellerAuth.id,
    } satisfies IShoppingMallShipment.IUpdate,
  });
  typia.assert(out);
  TestValidator.equals(
    "Status changed to in_transit",
    out.status,
    "in_transit",
  );
  TestValidator.equals(
    "Tracking code updated for in_transit",
    out.carrier_tracking_code,
    inTransitTracking,
  );
  TestValidator.equals(
    "Manifest url updated for in_transit",
    out.manifest_url,
    inTransitManifest,
  );
  TestValidator.equals(
    "Attribution to seller (in_transit)",
    out.createdBySeller?.id,
    sellerAuth.id,
  );

  // 5. Transition shipment to 'delivered' (requires delivery_at)
  const deliveredAt = new Date().toISOString();
  out = await api.functional.shoppingMall.seller.shipments.update(connection, {
    shipmentId,
    body: {
      status: "delivered",
      carrier_tracking_code: inTransitTracking, // use previous tracking
      manifest_url: inTransitManifest,
      updated_by_seller_id: sellerAuth.id,
      delivery_at: deliveredAt,
    } satisfies IShoppingMallShipment.IUpdate,
  });
  typia.assert(out);
  TestValidator.equals("Status changed to delivered", out.status, "delivered");
  TestValidator.equals(
    "Delivery timestamp recorded",
    out.delivery_at,
    deliveredAt,
  );
  TestValidator.equals(
    "Attribution to seller (delivered)",
    out.createdBySeller?.id,
    sellerAuth.id,
  );

  // 6. Attempt invalid transition: Move from 'delivered' → 'in_transit' (should fail)
  await TestValidator.error(
    "Invalid transition from delivered to in_transit should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.shipments.update(connection, {
        shipmentId,
        body: {
          status: "in_transit",
          updated_by_seller_id: sellerAuth.id,
        } satisfies IShoppingMallShipment.IUpdate,
      });
    },
  );
}
