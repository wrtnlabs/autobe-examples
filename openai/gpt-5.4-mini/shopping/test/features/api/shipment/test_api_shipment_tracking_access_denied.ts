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

export async function test_api_shipment_tracking_access_denied(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that shipment tracking access is denied for an administrator without permission.
   *
   * This test authenticates a dedicated administrator connection, then attempts to retrieve
   * shipment tracking details for a UUID that is not expected to be accessible in the current
   * test context. The goal is to ensure the endpoint protects shipment-level tracking data and
   * rejects unauthorized access instead of exposing carrier or tracking information.
   *
   * 1. Authenticate a fresh administrator connection using the join utility.
   * 2. Request shipment tracking for an inaccessible shipment identifier.
   * 3. Confirm the request is rejected with an authorization-related HTTP error.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const inaccessibleShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "administrator should not access unauthorized shipment tracking",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.administrator.shipments.tracking.at(
        administratorConnection,
        {
          shipmentId: inaccessibleShipmentId,
        },
      );
    },
  );
}
