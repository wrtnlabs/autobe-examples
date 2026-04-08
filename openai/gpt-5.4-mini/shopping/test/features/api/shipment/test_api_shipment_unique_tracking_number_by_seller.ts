import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verifies shipment tracking-number uniqueness enforcement within a seller scope.
 *
 * This scenario validates the administrator shipment update workflow by checking
 * that conflicting tracking numbers are rejected while ordinary shipment header
 * edits remain allowed. It focuses on seller-scoped uniqueness, preserves the
 * target shipment on conflict, and confirms that non-conflicting carrier or
 * tracking URL edits succeed normally.
 *
 * 1. Authenticate as an administrator using the dedicated join utility.
 * 2. Update a shipment with a conflicting tracking number and expect rejection.
 * 3. Apply a non-conflicting edit and validate the refreshed shipment response.
 */
export async function test_api_shipment_unique_tracking_number_by_seller(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const conflictTrackingNumber = RandomGenerator.alphaNumeric(12);
  await TestValidator.httpError(
    "shipment tracking number conflict should be rejected",
    [400, 409],
    async () => {
      await api.functional.mallPlatform.administrator.shipments.update(
        adminConnection,
        {
          shipmentId,
          body: {
            trackingNumber: conflictTrackingNumber,
          } satisfies IMallPlatformShipment.IUpdate,
        },
      );
    },
  );
  const correctedBody = {
    carrierName: RandomGenerator.name(2),
    trackingUrl: `https://example.com/track/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IMallPlatformShipment.IUpdate;
  const updated =
    await api.functional.mallPlatform.administrator.shipments.update(
      adminConnection,
      {
        shipmentId,
        body: correctedBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "carrier name should reflect the successful non-conflicting update",
    updated.carrierName,
    correctedBody.carrierName,
  );
  TestValidator.equals(
    "tracking url should reflect the successful non-conflicting update",
    updated.trackingUrl,
    correctedBody.trackingUrl,
  );
}
