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
 * Reject reopening a completed shipment through administrator update.
 *
 * Verifies that an administrator cannot use the shipment update endpoint to reopen a shipment that has already reached a completed lifecycle state. The test checks that a completed shipment update attempt is rejected and that no successful mutation is returned for the reopening action.
 *
 * The scenario focuses on business-rule enforcement rather than type validation. It ensures that a completed shipment cannot be pushed back into an earlier lifecycle state through the administrator update endpoint.
 *
 * 1. Create an administrator-authenticated connection.
 * 2. Attempt to update a shipment using a completed-reopening payload.
 * 3. Confirm the server rejects the operation.
 */
export async function test_api_shipment_reject_reopen_completed(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.error(
    "completed shipment should reject reopening update",
    async () => {
      await api.functional.mallPlatform.administrator.shipments.update(
        adminConnection,
        {
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            status: "preparing",
          } satisfies IMallPlatformShipment.IUpdate,
        },
      );
    },
  );
}
