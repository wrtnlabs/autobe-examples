import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Tests successful login with valid credentials for an existing registered user
 * in the todo user authentication flow.
 *
 * - Register a user with unique, valid credentials and proper context values
 * - Attempt login with the identical credentials used during registration
 * - Validate that login is successful and returns a correct ITodoUser.IAuthorized
 *   object
 * - Confirm that access/refresh tokens, expiration fields, and user context are
 *   all present and valid
 *
 * Step-by-step process:
 *
 * 1. Generate valid/unique registration data for a todo user account
 * 2. Register the user via api.functional.auth.user.join
 * 3. Attempt to login with the same email and password using
 *    api.functional.auth.user.login
 * 4. Assert the login response structure (typia.assert)
 * 5. Assert the response fields (id, email, created_at, updated_at, token) are
 *    correct and the email matches original
 * 6. Assert the nested token contains access, refresh, expired_at,
 *    refreshable_until fields (with valid date-time strings)
 * 7. Validate no error is thrown, and login is successful
 */
export async function test_api_todo_user_login_success(
  connection: api.IConnection,
) {
  // 1. Generate registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // meets min 8 chars
  const href = "https://example.com/register";
  const referrer = "https://example.com/";

  // 2. Register user
  const joinBody = {
    email,
    password: password as string & tags.MinLength<8> & tags.MaxLength<128>,
    href: href as string & tags.Format<"uri">,
    referrer: referrer as string & tags.Format<"uri">,
    ip: null,
  } satisfies ITodoUser.ICreate;
  const registered = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(registered);
  TestValidator.equals(
    "registration email matches input",
    registered.email,
    email,
  );

  // 3. Login with the same credentials
  const loginBody = {
    email,
    password,
    href,
    referrer,
    ip: null,
  } satisfies ITodoUser.ILogin;
  const loggedIn = await api.functional.auth.user.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedIn);

  // 4. Validate login output fields
  TestValidator.equals("login email matches", loggedIn.email, email);
  TestValidator.equals("id matches registration", loggedIn.id, registered.id);
  TestValidator.equals(
    "created_at matches registration",
    loggedIn.created_at,
    registered.created_at,
  );
  TestValidator.equals("token present", typeof loggedIn.token, "object");
  typia.assert(loggedIn.token);
  TestValidator.equals(
    "access token present",
    typeof loggedIn.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token present",
    typeof loggedIn.token.refresh,
    "string",
  );
  TestValidator.equals(
    "expired_at present",
    typeof loggedIn.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "refreshable_until present",
    typeof loggedIn.token.refreshable_until,
    "string",
  );
}
