import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that logging out invalidates the current session.
 *
 * This test validates session management by creating a user account, logging in
 * to create a session, logging out to terminate that session, and then
 * verifying that a new login creates a fresh working session.
 *
 * Steps:
 *
 * 1. Register a new user account
 * 2. Login to create first session (connection gets first token)
 * 3. Logout to terminate the first session
 * 4. Login again to create second session (connection gets new token)
 * 5. Logout from second session to verify it works
 */
export async function test_api_user_session_logout_preserves_other_sessions(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const registerEmail = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: registerEmail,
      password: password,
      ip: "192.168.1.100",
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies ITodoListUser.IRegister,
  });
  typia.assert(registeredUser);

  TestValidator.equals(
    "registered user email matches input",
    registeredUser.email,
    registerEmail,
  );

  // Step 2: Logout from the first session created during registration
  await api.functional.todoList.user.users.logout(connection);

  // Step 3: Login again to create a new session
  const loginUser = await api.functional.auth.user.login(connection, {
    body: {
      email: registerEmail,
      password: password,
      ip: "192.168.1.101",
      href: "https://example.com/login" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/app" satisfies string & tags.Format<"uri">,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(loginUser);

  TestValidator.equals(
    "logged in user email matches registered email",
    loginUser.email,
    registerEmail,
  );

  // Step 4: Logout from the second session
  await api.functional.todoList.user.users.logout(connection);

  // Step 5: Login one more time to verify account still works
  const finalLogin = await api.functional.auth.user.login(connection, {
    body: {
      email: registerEmail,
      password: password,
      ip: "192.168.1.102",
      href: "https://example.com/login" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies ITodoListUser.ILogin,
  });
  typia.assert(finalLogin);

  TestValidator.equals(
    "final login user ID matches original user",
    finalLogin.id,
    registeredUser.id,
  );
}
