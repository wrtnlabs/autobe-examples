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
 * Verify missing shipment tracking requests return a not found error.
 *
 * This test authenticates an administrator using the dedicated join utility and
 * then requests tracking details for a shipment UUID that should not exist.
 * It validates the business-level missing-resource behavior for the admin
 * shipment tracking endpoint without relying on any partial shipment data.
 *
 * 1. Create an isolated administrator connection from the base connection.
 * 2. Authenticate the administrator with valid registration credentials.
 * 3. Request tracking details for a non-existent shipment identifier.
 * 4. Confirm the endpoint responds with a 404 not found error.
 */
export async function test_api_shipment_tracking_not_found(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "missing shipment tracking should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.shipments.tracking.at(
        administratorConnection,
        {
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
