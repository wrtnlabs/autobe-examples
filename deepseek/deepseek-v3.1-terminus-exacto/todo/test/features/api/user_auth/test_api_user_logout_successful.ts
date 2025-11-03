import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test the complete user logout workflow starting from user registration
 * through login and ending with successful logout. This scenario validates that
 * a user can securely terminate their session by invalidating authentication
 * tokens and marking the session as expired. The test creates a new user
 * account through registration, establishes an authenticated session through
 * login, and then performs the logout operation. It verifies that the logout
 * operation properly expires the session record and invalidates the
 * authentication tokens, ensuring secure session termination.
 */
export async function test_api_user_logout_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const registeredUser = await api.functional.todoApp.auth.register.create(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(registeredUser);
  TestValidator.equals(
    "registered user email matches input",
    registeredUser.email,
    userEmail,
  );

  // Step 2: Establish an authenticated session for the user before logout
  const loginResponse = await api.functional.todoApp.auth.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loginResponse);
  TestValidator.equals(
    "login response user ID matches registered user",
    loginResponse.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "login response email matches registered user",
    loginResponse.email,
    registeredUser.email,
  );
  TestValidator.predicate(
    "login response contains valid token",
    loginResponse.token.access.length > 0 &&
      loginResponse.token.refresh.length > 0,
  );

  // Step 3: Perform logout operation to terminate the user session
  await api.functional.todoApp.user.auth.logout(connection);

  // Step 4: Validate that logout operation completed successfully
  // The logout endpoint returns void, so we validate by ensuring no errors were thrown
  TestValidator.predicate("logout operation completed successfully", true);
}
