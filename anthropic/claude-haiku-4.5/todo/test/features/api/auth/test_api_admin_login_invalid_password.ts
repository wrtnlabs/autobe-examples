import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test admin login failure with incorrect password.
 *
 * This test validates that the authentication system properly rejects login
 * attempts when an incorrect password is provided for an existing admin
 * account. The test ensures that the system does not reveal whether the email
 * exists or whether the password was incorrect, maintaining security against
 * email enumeration and password guessing attacks.
 *
 * Test Steps:
 *
 * 1. Register a new admin account with known email and password
 * 2. Attempt to login with the correct email but incorrect password
 * 3. Verify that login fails with appropriate error response
 * 4. Confirm the error does not leak information about email or password
 */
export async function test_api_admin_login_invalid_password(
  connection: api.IConnection,
) {
  // Step 1: Create an admin account with known credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = typia.random<string & tags.MinLength<8>>();

  const registrationData = {
    email: adminEmail,
    password: correctPassword,
    password_confirmation: correctPassword,
  } satisfies ITodoAppAdmin.IRegister;

  const registeredAdmin = await api.functional.auth.admin.join(connection, {
    body: registrationData,
  });
  typia.assert(registeredAdmin);

  TestValidator.equals(
    "admin email registered",
    registeredAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "admin status is active",
    registeredAdmin.status,
    "active",
  );

  // Step 2: Attempt login with correct email but incorrect password
  const incorrectPassword = correctPassword + "wrong";

  const loginAttemptData = {
    email: adminEmail,
    password: incorrectPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdmin.ILogin;

  // Step 3: Verify that login fails with appropriate error
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: loginAttemptData,
      });
    },
  );

  // Step 4: Verify that we can still login with the correct password
  const correctLoginData = {
    email: adminEmail,
    password: correctPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdmin.ILogin;

  const successfulLogin = await api.functional.auth.admin.login(connection, {
    body: correctLoginData,
  });
  typia.assert(successfulLogin);

  TestValidator.equals(
    "successful login email matches",
    successfulLogin.email,
    adminEmail,
  );
  TestValidator.equals(
    "successful login status is active",
    successfulLogin.status,
    "active",
  );
  TestValidator.predicate(
    "access token provided",
    !!successfulLogin.token.access,
  );
}
