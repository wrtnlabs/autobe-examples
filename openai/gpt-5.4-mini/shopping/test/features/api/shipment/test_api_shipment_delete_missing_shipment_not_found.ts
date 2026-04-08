import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verify shipment deletion returns not found for a missing shipment identifier.
 *
 * This test authenticates an administrator, then attempts to delete a shipment
 * using a randomly generated UUID that should not match any persisted shipment.
 * It validates the endpoint's not-found behavior for missing resources and
 * ensures the operation fails cleanly without affecting unrelated shipment or
 * order state.
 *
 * 1. Authenticate as an administrator through the administrator join flow.
 * 2. Call the shipment deletion endpoint with a non-existent shipment UUID.
 * 3. Assert the request fails with a not-found HTTP error.
 */
export async function test_api_shipment_delete_missing_shipment_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "shipment delete should fail with not found for a missing shipment",
    404,
    async () => {
      await api.functional.mallPlatform.administrator.shipments.erase(
        adminConnection,
        {
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
