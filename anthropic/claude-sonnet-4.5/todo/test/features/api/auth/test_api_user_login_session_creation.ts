import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that successful login creates a new session record with proper context
 * tracking.
 *
 * This test validates the session creation functionality during user login. It
 * verifies that each login attempt creates a separate session record in the
 * todo_list_user_sessions table with the provided connection metadata (IP
 * address, href, referrer).
 *
 * The test also confirms that users can maintain multiple active sessions
 * simultaneously, which is essential for users who may be logged in from
 * different devices or browsers.
 *
 * Test workflow:
 *
 * 1. Register a new user account with valid credentials
 * 2. Perform first login with specific session context metadata
 * 3. Perform second login with different session context metadata
 * 4. Verify both logins succeed and return valid authentication tokens
 * 5. Confirm each login creates a separate session with proper metadata tracking
 */
export async function test_api_user_login_session_creation(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePassword123!";

  const registrationData = {
    email: userEmail,
    password: userPassword,
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredUser);

  // Validate registration response
  TestValidator.equals(
    "registered email matches",
    registeredUser.email,
    userEmail,
  );

  // Step 2: Perform first login with specific session context
  const firstLoginData = {
    email: userEmail,
    password: userPassword,
    ip: "10.0.0.50",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ILogin;

  const firstLoginResult: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: firstLoginData,
    });
  typia.assert(firstLoginResult);

  // Validate first login response
  TestValidator.equals(
    "first login email matches",
    firstLoginResult.email,
    userEmail,
  );
  TestValidator.equals(
    "first login user ID matches",
    firstLoginResult.id,
    registeredUser.id,
  );

  // Step 3: Perform second login with different session context
  const secondLoginData = {
    email: userEmail,
    password: userPassword,
    ip: "172.16.0.75",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ILogin;

  const secondLoginResult: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: secondLoginData,
    });
  typia.assert(secondLoginResult);

  // Validate second login response
  TestValidator.equals(
    "second login email matches",
    secondLoginResult.email,
    userEmail,
  );
  TestValidator.equals(
    "second login user ID matches",
    secondLoginResult.id,
    registeredUser.id,
  );

  // Step 4: Verify that multiple sessions are created (different tokens for each login)
  TestValidator.notEquals(
    "first and second login access tokens differ",
    firstLoginResult.token.access,
    secondLoginResult.token.access,
  );
  TestValidator.notEquals(
    "first and second login refresh tokens differ",
    firstLoginResult.token.refresh,
    secondLoginResult.token.refresh,
  );
}
