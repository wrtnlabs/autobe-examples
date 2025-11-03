import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that a user can successfully log out from their current session on a
 * single device.
 *
 * This test validates the logout workflow where a user creates an account, logs
 * in to establish a session, and then explicitly logs out from that session.
 * The test verifies that after logout, the session is marked as expired in the
 * todo_list_user_sessions table by checking that the user's access token is no
 * longer valid for subsequent authenticated requests.
 *
 * Steps:
 *
 * 1. Create a new user account with random email and password
 * 2. Verify user account creation with valid authentication tokens
 * 3. Login with the same credentials to establish an active session
 * 4. Verify login returns valid authentication tokens
 * 5. Call logout endpoint to terminate the current session
 * 6. Verify logout completes successfully
 * 7. Attempt an authenticated request after logout to confirm session is expired
 */
export async function test_api_user_session_logout_current_device(
  connection: api.IConnection,
) {
  // Step 1: Generate test user credentials
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPass123";

  // Step 2: Register a new user account
  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies ITodoListUser.IRegister,
    });
  typia.assert(registeredUser);

  // Step 3: Verify registration returned valid user data
  TestValidator.equals(
    "registered user email matches",
    registeredUser.email,
    userEmail,
  );

  // Step 4: Login with the registered user credentials
  const loggedInUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://example.com/login" satisfies string & tags.Format<"uri">,
        referrer: "https://example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies ITodoListUser.ILogin,
    });
  typia.assert(loggedInUser);

  // Step 5: Verify login returned valid user data
  TestValidator.equals(
    "logged in user email matches",
    loggedInUser.email,
    userEmail,
  );
  TestValidator.equals(
    "logged in user id matches",
    loggedInUser.id,
    registeredUser.id,
  );

  // Step 6: Logout from the current session
  await api.functional.todoList.user.users.logout(connection);

  // Step 7: Verify that authenticated requests fail after logout
  await TestValidator.error(
    "authenticated request should fail after logout",
    async () => {
      await api.functional.todoList.user.users.logout(connection);
    },
  );
}
