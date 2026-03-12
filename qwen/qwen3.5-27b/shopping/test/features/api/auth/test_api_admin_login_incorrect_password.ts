import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator login rejection with incorrect password.
 * 1. Register a new admin account with known credentials
 * 2. Attempt login with incorrect password and verify rejection
 * 3. Confirm account remains accessible with correct password
 */
export async function test_api_admin_login_incorrect_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account with known credentials
  const registerConnection: api.IConnection = { host: connection.host };
  const testEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = RandomGenerator.alphaNumeric(16);
  const registeredAdmin = await authorize_admin_join(registerConnection, {
    body: {
      email: testEmail,
      password: correctPassword,
    },
  });
  typia.assert(registeredAdmin);
  const incorrectPassword = "wrongpassword123";
  // 2. Attempt login with incorrect password
  const failedLoginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login with incorrect password returns 401",
    401,
    async () =>
      await authorize_admin_login(failedLoginConnection, {
        body: {
          email: registeredAdmin.email,
          password: incorrectPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IShoppingMallAdmin.ILogin,
      }),
  );
  // 3. Verify account is still accessible with correct password
  const successfulLoginConnection: api.IConnection = { host: connection.host };
  const successfulLogin = await authorize_admin_login(
    successfulLoginConnection,
    {
      body: {
        email: registeredAdmin.email,
        password: correctPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallAdmin.ILogin,
    },
  );
  typia.assert(successfulLogin);
  // 4. Verify successful login returns valid tokens
  TestValidator.predicate(
    "successful login returns access token",
    successfulLogin.token.access.length > 0,
  );
  TestValidator.predicate(
    "successful login returns refresh token",
    successfulLogin.token.refresh.length > 0,
  );
  TestValidator.equals(
    "email matches registered admin",
    successfulLogin.email,
    registeredAdmin.email,
  );
}
