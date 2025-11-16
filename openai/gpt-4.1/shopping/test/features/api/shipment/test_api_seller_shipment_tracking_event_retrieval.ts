import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipmentTrackingHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingHistory";

/**
 * Validates that an authenticated seller can retrieve a specific shipment
 * tracking event for their shipments, and access is denied for non-owned
 * events.
 *
 * 1. Register a new seller (via auth.seller.join).
 * 2. Generate a plausible shipment tracking history record (simulate, as shipment
 *    creation API is not available).
 * 3. As the registered seller, invoke
 *    api.functional.shoppingMall.seller.shipments.trackingHistories.at with
 *    shipmentId and trackingHistoryId.
 * 4. Validate that response matches IShoppingMallShipmentTrackingHistory schema.
 * 5. Attempt to fetch an event not belonging to this seller (simulate random
 *    shipmentId), and verify access control error occurs.
 */
export async function test_api_seller_shipment_tracking_event_retrieval(
  connection: api.IConnection,
) {
  // 1. Seller registration
  const sellerInfo = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(),
    registration_number: RandomGenerator.alphaNumeric(12),
    business_phone: RandomGenerator.mobile(),
    href: "https://seller-app.test/registration",
    referrer: "https://app.test/landing",
    ip: undefined,
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerInfo });
  typia.assert(seller);

  // 2. Simulate a shipment tracking event belonging to this seller.
  const trackingHistory: IShoppingMallShipmentTrackingHistory =
    typia.random<IShoppingMallShipmentTrackingHistory>();

  // 3. Fetch the tracking history event as this seller (simulate as if the tracking event is from seller's shipment)
  const fetchedHistory =
    await api.functional.shoppingMall.seller.shipments.trackingHistories.at(
      connection,
      {
        shipmentId: trackingHistory.shipment_id,
        trackingHistoryId: trackingHistory.id,
      },
    );
  typia.assert(fetchedHistory);
  TestValidator.equals(
    "retrieved tracking history should match shipment id",
    fetchedHistory.shipment_id,
    trackingHistory.shipment_id,
  );
  TestValidator.equals(
    "retrieved tracking history should match tracking event id",
    fetchedHistory.id,
    trackingHistory.id,
  );

  // 4. Simulate access control: attempt fetching event with a random unrelated shipmentId or trackingHistoryId
  const otherHistory = typia.random<IShoppingMallShipmentTrackingHistory>();
  await TestValidator.error(
    "should deny access to unrelated tracking history event",
    async () => {
      await api.functional.shoppingMall.seller.shipments.trackingHistories.at(
        connection,
        {
          shipmentId: otherHistory.shipment_id,
          trackingHistoryId: otherHistory.id,
        },
      );
    },
  );
}
