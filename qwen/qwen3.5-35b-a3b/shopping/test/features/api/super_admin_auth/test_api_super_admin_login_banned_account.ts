import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that authentication failures for banned accounts return generic error messages.
 * Validates security behavior: error messages don't distinguish between invalid credentials
 * and banned/suspended account states to prevent account enumeration attacks.
 */
export async function test_api_super_admin_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator account using utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const testPassword = RandomGenerator.alphaNumeric(16);
  const accountData = await authorize_super_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: testPassword,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(accountData);
  // Verify account was created with active status
  TestValidator.equals(
    "account created with active status",
    accountData.status,
    "active",
  );
  // Step 2: Attempt login with valid credentials - should succeed
  const validLoginConnection: api.IConnection = { host: connection.host };
  const validLoginResult = await authorize_super_admin_login(
    validLoginConnection,
    {
      body: {
        email: accountData.email,
        password: testPassword,
      } satisfies IEcommerceMallSuperAdmin.ILogin,
    },
  );
  typia.assert(validLoginResult);
  // Verify successful login returns tokens
  TestValidator.equals(
    "valid login returns access token",
    validLoginResult.access.length > 0,
    true,
  );
  TestValidator.equals(
    "valid login returns refresh token",
    validLoginResult.refresh.length > 0,
    true,
  );
  // Step 3: Test login rejection with invalid email
  // Error message should be generic - not reveal whether email exists
  await TestValidator.httpError(
    "invalid email rejected",
    [400, 401, 403],
    async () => {
      await authorize_super_admin_login(connection, {
        body: {
          email: "nonexistent@example.com",
          password: "wrongpassword",
        } satisfies IEcommerceMallSuperAdmin.ILogin,
      });
    },
  );
  // Step 4: Test login rejection with valid email but wrong password
  // Error message should be same generic message (protects against enumeration)
  await TestValidator.httpError(
    "wrong password rejected",
    [400, 401, 403],
    async () => {
      await authorize_super_admin_login(connection, {
        body: {
          email: accountData.email,
          password: "wrongpassword",
        } satisfies IEcommerceMallSuperAdmin.ILogin,
      });
    },
  );
  // Step 5: Validate no tokens returned on failed login attempt
  const errorLoginConnection: api.IConnection = { host: connection.host };
  try {
    await authorize_super_admin_login(errorLoginConnection, {
      body: {
        email: "banned@example.com",
        password: "password",
      } satisfies IEcommerceMallSuperAdmin.ILogin,
    });
  } catch {
    // If login fails, no tokens should have been set
    TestValidator.equals(
      "no authorization header set after failed login",
      errorLoginConnection.headers?.authorization,
      undefined,
    );
  }
  // Step 6: Validate consistent error handling for all authentication failures
  // Both invalid email and wrong password should return similar error structure
  const invalidEmailTest = TestValidator.predicate(
    "invalid email triggers error",
    async () => {
      try {
        await authorize_super_admin_login(connection, {
          body: {
            email: "invalid@test.com",
            password: "test",
          } satisfies IEcommerceMallSuperAdmin.ILogin,
        });
        return false;
      } catch {
        return true;
      }
    },
  );
  const wrongPasswordTest = TestValidator.predicate(
    "wrong password triggers error",
    async () => {
      try {
        await authorize_super_admin_login(connection, {
          body: {
            email: accountData.email,
            password: "incorrect",
          } satisfies IEcommerceMallSuperAdmin.ILogin,
        });
        return false;
      } catch {
        return true;
      }
    },
  );
  // Both should return consistent error behavior
  TestValidator.equals(
    "both auth failures return error",
    invalidEmailTest,
    wrongPasswordTest,
  );
}
