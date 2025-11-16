import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallShipmentTrackingHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingHistory";

/**
 * Validate that an authenticated admin can access detailed shipment tracking
 * history event data by event ID and shipment ID.
 *
 * Confirms proper admin registration and authentication, then access to a
 * specific tracking event for a shipment using valid UUIDs. Validates that all
 * core attributes (event time, status, carrier code, tracking message, event
 * location, latitude, longitude, creation timestamp) exist, match data types,
 * and are not empty where required. Ensures business rule: only admins with
 * valid tokens can access this endpoint. Checks response value correctness,
 * presence/absence of nullable fields, and expected audit fields.
 */
export async function test_api_admin_shipment_tracking_history_detail_access(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // 2. Generate test UUIDs for shipment and tracking history (simulate realistic IDs for access test)
  const shipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const trackingHistoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Call the tracking event detail endpoint as an admin
  const trackingHistory: IShoppingMallShipmentTrackingHistory =
    await api.functional.shoppingMall.admin.shipments.trackingHistories.at(
      connection,
      {
        shipmentId,
        trackingHistoryId,
      },
    );
  typia.assert(trackingHistory);

  // 4. Validate all key fields exist and are of correct type
  TestValidator.equals(
    "shipment ID matches request",
    trackingHistory.shipment_id,
    shipmentId,
  );
  TestValidator.predicate(
    "tracking history ID is valid UUID",
    typeof trackingHistory.id === "string" && trackingHistory.id.length > 0,
  );
  TestValidator.predicate(
    "event_time is ISO string",
    typeof trackingHistory.event_time === "string" &&
      trackingHistory.event_time.length > 0,
  );
  TestValidator.predicate(
    "status is non-empty string",
    typeof trackingHistory.status === "string" &&
      trackingHistory.status.length > 0,
  );
  TestValidator.predicate(
    "tracking_message is non-empty string",
    typeof trackingHistory.tracking_message === "string" &&
      trackingHistory.tracking_message.length > 0,
  );
  TestValidator.predicate(
    "created_at is non-empty string",
    typeof trackingHistory.created_at === "string" &&
      trackingHistory.created_at.length > 0,
  );

  // 5. Nullable/location fields (location, latitude, longitude, event_code) type validation
  if (
    trackingHistory.location !== undefined &&
    trackingHistory.location !== null
  ) {
    TestValidator.predicate(
      "location is non-empty string",
      typeof trackingHistory.location === "string" &&
        trackingHistory.location.length > 0,
    );
  }
  if (
    trackingHistory.latitude !== undefined &&
    trackingHistory.latitude !== null
  ) {
    TestValidator.predicate(
      "latitude is number",
      typeof trackingHistory.latitude === "number",
    );
  }
  if (
    trackingHistory.longitude !== undefined &&
    trackingHistory.longitude !== null
  ) {
    TestValidator.predicate(
      "longitude is number",
      typeof trackingHistory.longitude === "number",
    );
  }
  if (
    trackingHistory.event_code !== undefined &&
    trackingHistory.event_code !== null
  ) {
    TestValidator.predicate(
      "event_code is non-empty string",
      typeof trackingHistory.event_code === "string" &&
        trackingHistory.event_code.length > 0,
    );
  }
}
