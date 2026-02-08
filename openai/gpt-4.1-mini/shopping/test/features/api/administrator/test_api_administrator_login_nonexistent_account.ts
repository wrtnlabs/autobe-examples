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

export async function test_api_administrator_login_nonexistent_account(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for administrator login failure due to non-existent account
  const adminConnection: api.IConnection = { host: connection.host };
  // Use a clearly non-existent email for testing login failure
  const nonExistentLoginBody: IShoppingMallAdministrator.ILogin = {
    email: `nonexistent_${Date.now()}@example.com`,
    password: "invalid_password_1234",
  };
  // Expecting an HttpError with status 401 (Unauthorized) on login attempt
  await TestValidator.httpError(
    "administrator login should fail for non-existent account",
    401,
    async () => {
      // Use utility function for administrator login
      await authorize_administrator_login(adminConnection, {
        body: nonExistentLoginBody,
      });
    },
  );
}
