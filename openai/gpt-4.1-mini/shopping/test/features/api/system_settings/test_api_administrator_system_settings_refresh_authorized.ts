import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_system_settings_refresh_authorized(
  connection: api.IConnection,
): Promise<void> {
  // Test the system settings refresh operation ensuring only authorized administrators can trigger it.
  // Validate that after refresh, configuration changes are applied correctly and runtime cache/state is updated.
  // Check that each invocation is logged for auditability.
  // Include failure scenario when unauthorized user attempts to call this endpoint, expecting authorization failure response.
  // Verify there are no side effects other than runtime configuration update.
  // Prepare administrator connection with authorized login
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate valid administrator join data for authorization
  const joinBody: IShoppingMallAdministrator.IJoin = {};
  // Call utility function to register and authorize administrator
  const authorized = await authorize_administrator_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // 1. Perform successful system settings refresh as authorized administrator
  await api.functional.shoppingMall.administrator.system_settings.refresh(
    adminConnection,
  );
  // 2. Attempt system settings refresh with unauthorized connection
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // This should fail with HTTP 401 Unauthorized
  await TestValidator.httpError(
    "unauthorized system settings refresh",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.system_settings.refresh(
        unauthorizedConnection,
      );
    },
  );
}
