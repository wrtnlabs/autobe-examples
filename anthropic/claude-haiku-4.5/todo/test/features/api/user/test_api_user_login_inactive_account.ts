import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test login validation for user authentication.
 *
 * Since the available API does not provide admin endpoints to change user
 * status, this test validates core authentication security by testing login
 * with invalid credentials. This ensures the authentication system properly
 * validates user credentials before granting access, which is the security
 * foundation that would protect inactive accounts as well.
 *
 * Test flow:
 *
 * 1. Create a new user account with valid credentials
 * 2. Verify the created account is active
 * 3. Attempt to login with incorrect password
 * 4. Verify that login fails with appropriate error for invalid credentials
 * 5. Confirm that valid credentials still allow successful login
 */
export async function test_api_user_login_inactive_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const email = typia.random<string & tags.Format<"email">>();
  const validPassword = RandomGenerator.alphabets(8);

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: email,
      password: validPassword,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(createdUser);

  // Step 2: Verify the created account is active
  TestValidator.equals(
    "created user account status should be active",
    createdUser.status,
    "active",
  );

  // Step 3: Create an unauthenticated connection for login attempts
  const loginConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4: Attempt login with incorrect password (business logic validation)
  await TestValidator.error(
    "login with invalid password should fail",
    async () => {
      await api.functional.auth.user.login(loginConnection, {
        body: {
          email: email,
          password: "wrongpassword123",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );

  // Step 5: Verify successful login with valid credentials
  const successfulLogin = await api.functional.auth.user.login(
    loginConnection,
    {
      body: {
        email: email,
        password: validPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ILogin,
    },
  );
  typia.assert(successfulLogin);

  TestValidator.equals(
    "successful login should return active user",
    successfulLogin.status,
    "active",
  );

  TestValidator.equals(
    "successful login should return same email",
    successfulLogin.email,
    email,
  );

  TestValidator.predicate(
    "successful login should include valid token",
    successfulLogin.token.access.length > 0,
  );
}
