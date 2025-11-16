import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallShipmentTrackingEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTrackingEvent";

/**
 * Validate that platform admin cannot create tracking events for non-existent
 * shipments.
 *
 * Business goal:
 *
 * - Ensure the shipment tracking event creation endpoint enforces referential
 *   integrity with shopping_mall_shipments and rejects orphan tracking events
 *   even when called by a fully authenticated platform administrator.
 *
 * Scenario:
 *
 * 1. Register a new platform admin using POST /auth/platformAdmin/join.
 *
 *    - This both creates the admin identity and installs a valid Authorization
 *         header on the shared connection via the SDK.
 * 2. Generate a random UUID value to act as a bogus shipmentId.
 *
 *    - The test must not create any shipment; the UUID should not match any
 *         shopping_mall_shipments.id so that business-level existence checks
 *         fail.
 * 3. Build a syntactically correct IShoppingMallShipmentTrackingEvent.ICreate
 *    payload with:
 *
 *    - Status: some realistic value like "in_transit".
 *    - Occurred_at: an ISO 8601 date-time string (e.g., new Date().toISOString()).
 *    - Optional fields either omitted or set to null consistently.
 * 4. Invoke
 *    api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.create
 *    with the bogus shipmentId and the valid body.
 * 5. Use TestValidator.httpError to assert that the operation fails with a client
 *    error in the 4xx range (e.g., 400 or 404), without hard-coding a single
 *    status if the exact code is unspecified.
 *
 *    - Do not validate specific error messages; only ensure that an HttpError with
 *         an appropriate status is thrown.
 * 6. The test should not attempt any additional listing or retrieval, as no
 *    shipment exists for the bogus ID.
 */
export async function test_api_platform_admin_rejects_tracking_event_for_nonexistent_shipment(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing/platform-admin",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Generate a bogus shipmentId that does not correspond to any real shipment
  const bogusShipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare a syntactically valid tracking event creation payload
  const trackingEventBody = {
    status: "in_transit",
    carrier_status_code: null,
    location_description: null,
    carrier_raw_message: null,
    occurred_at: new Date().toISOString(),
  } satisfies IShoppingMallShipmentTrackingEvent.ICreate;

  // 4-5. Attempt to create the tracking event and assert that it fails
  await TestValidator.httpError(
    "platform admin cannot create tracking event for non-existent shipment",
    [400, 404],
    async () => {
      await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.create(
        connection,
        {
          shipmentId: bogusShipmentId,
          body: trackingEventBody,
        },
      );
    },
  );
}
