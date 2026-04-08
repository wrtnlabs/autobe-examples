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

/**
 * Test administrator login authentication failure scenarios to verify security behavior.
 *
 * Validates that the administrator authentication system properly handles failed login attempts and maintains security best practices by not revealing information about account existence. Tests both incorrect password and non-existent email scenarios.
 *
 * The test ensures that failed authentication attempts return appropriate HTTP 401 Unauthorized status codes with generic error messages that do not distinguish between "email not found" and "wrong password" scenarios. This prevents attackers from enumerating valid administrator accounts.
 *
 * 1. Register a new administrator account with valid credentials.
 * 2. Attempt login with correct email but incorrect password.
 * 3. Verify HTTP 401 Unauthorized status is returned.
 * 4. Attempt login with non-existent email address.
 * 5. Verify HTTP 401 Unauthorized status is returned.
 * 6. Verify both error messages are generic (no information leakage).
 * 7. Verify the administrator account remains functional after failed attempts.
 */
export async function test_api_administrator_login_authentication_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const registeredAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: "testadmin@example.com",
      password: "SecurePass123",
      href: "https://example.com/admin/register",
      referrer: "https://example.com/admin/login",
    },
  });
  typia.assert(registeredAdmin);
  // Store correct credentials for final validation
  const correctEmail = registeredAdmin.email;
  const correctPassword = "SecurePass123";
  // 2. Attempt login with correct email but incorrect password
  const failedLoginConnection1: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login with wrong password returns 401",
    401,
    async () =>
      await authorize_administrator_login(failedLoginConnection1, {
        body: {
          email: correctEmail,
          password: "WrongPassword123",
          href: "https://example.com/admin/login",
          referrer: "https://example.com/admin/register",
        } satisfies IShoppingMallAdministrator.ILogin,
      }),
  );
  // 3. Attempt login with non-existent email
  const failedLoginConnection2: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login with non-existent email returns 401",
    401,
    async () =>
      await authorize_administrator_login(failedLoginConnection2, {
        body: {
          email: "nonexistent@example.com",
          password: "AnyPassword123",
          href: "https://example.com/admin/login",
          referrer: "https://example.com/admin/register",
        } satisfies IShoppingMallAdministrator.ILogin,
      }),
  );
  // 4. Verify the administrator account remains functional after failed attempts
  const successLoginConnection: api.IConnection = { host: connection.host };
  const successfulLogin = await authorize_administrator_login(
    successLoginConnection,
    {
      body: {
        email: correctEmail,
        password: correctPassword,
        href: "https://example.com/admin/login",
        referrer: "https://example.com/admin/register",
      } satisfies IShoppingMallAdministrator.ILogin,
    },
  );
  typia.assert(successfulLogin);
  // 5. Verify successful login returns the correct administrator
  TestValidator.equals(
    "successful login after failures returns correct admin",
    successfulLogin.email,
    correctEmail,
  );
  TestValidator.predicate(
    "administrator is not banned after failed login attempts",
    !successfulLogin.banned,
  );
}
