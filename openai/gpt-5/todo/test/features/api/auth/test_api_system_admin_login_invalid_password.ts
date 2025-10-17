import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemAdmin";

/**
 * Validate that system admin login fails with an incorrect password.
 *
 * Steps:
 *
 * 1. Register a new system admin account via join (email + password)
 * 2. Attempt to login with the same email but a wrong password – expect failure
 * 3. Repeat the invalid login attempt to ensure consistent failure behavior
 * 4. Finally, login with the correct password from a fresh, unauthenticated
 *    connection to verify the account remains usable (lockout policy is out of
 *    scope for this single test)
 *
 * Notes:
 *
 * - Avoid checking specific HTTP status codes; only assert that an error occurs
 * - Do not access or modify connection.headers; create a new connection object
 *   with headers: {} for unauthenticated calls and never touch it afterwards
 */
export async function test_api_system_admin_login_invalid_password(
  connection: api.IConnection,
) {
  // 1) Prepare test data: random email and a strong password
  const email = typia.random<string & tags.Format<"email">>();
  const password = `${RandomGenerator.alphaNumeric(16)}!A`;

  // 2) Join (admin registration) with valid credentials
  const joined = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email,
      password,
    } satisfies ITodoListSystemAdmin.ICreate,
  });
  typia.assert(joined);
  TestValidator.equals("joined email echoes input", joined.email, email);

  // 3) Fresh unauthenticated connection for login attempts
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4) Invalid login attempts (two times) – expect failures without status checks
  const wrongBody1 = {
    email,
    password: `${password}-wrong-1`,
  } satisfies ITodoListSystemAdmin.ILogin;
  await TestValidator.error(
    "login should fail with incorrect password (first attempt)",
    async () => {
      await api.functional.auth.systemAdmin.login(unauthConn, {
        body: wrongBody1,
      });
    },
  );

  const wrongBody2 = {
    email,
    password: `${password}-wrong-2`,
  } satisfies ITodoListSystemAdmin.ILogin;
  await TestValidator.error(
    "login should consistently fail with incorrect password (second attempt)",
    async () => {
      await api.functional.auth.systemAdmin.login(unauthConn, {
        body: wrongBody2,
      });
    },
  );

  // 5) Sanity check: correct login should succeed from fresh unauthenticated connection
  const success = await api.functional.auth.systemAdmin.login(unauthConn, {
    body: {
      email,
      password,
    } satisfies ITodoListSystemAdmin.ILogin,
  });
  typia.assert(success);
  TestValidator.equals(
    "successful login returns the same email",
    success.email,
    email,
  );
}
