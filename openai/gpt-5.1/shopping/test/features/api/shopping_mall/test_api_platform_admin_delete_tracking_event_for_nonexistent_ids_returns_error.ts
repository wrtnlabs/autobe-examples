import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_delete_tracking_event_for_nonexistent_ids_returns_error(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator so that
  //    authorization is not the cause of any error we observe.
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Generate obviously non-existent shipment and tracking event IDs.
  const nonexistentShipmentId = typia.random<string & tags.Format<"uuid">>();
  const nonexistentTrackingEventId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. When calling erase with bogus IDs, the API must signal a
  //    client-side error (4xx). We can't depend on an exact status
  //    code like 404, so we allow common client error codes.
  await TestValidator.httpError(
    "erase with completely non-existent shipment and trackingEvent IDs should fail with client error",
    [400, 404, 409, 422],
    async () => {
      await api.functional.shoppingMall.platformAdmin.shipments.trackingEvents.erase(
        connection,
        {
          shipmentId: nonexistentShipmentId,
          trackingEventId: nonexistentTrackingEventId,
        },
      );
    },
  );
}
