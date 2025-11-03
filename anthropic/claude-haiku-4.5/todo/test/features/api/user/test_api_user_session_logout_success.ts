import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppLogoutResponse";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful user logout operation that invalidates the session and
 * authentication token.
 *
 * This test validates that after a user creates an account and authenticates,
 * they can successfully logout which terminates their session and invalidates
 * their JWT token. The test ensures the logout operation properly marks the
 * session as expired and prevents further authenticated requests with the
 * invalidated token.
 *
 * **Workflow:**
 *
 * 1. Register new user account with email and password
 * 2. Verify registration returns authenticated user with valid JWT tokens
 * 3. Call logout endpoint while authenticated
 * 4. Verify logout response confirms successful session termination
 * 5. Validate response includes success flag and confirmation message
 */
export async function test_api_user_session_logout_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
  } satisfies ITodoAppUser.IJoin;

  const registeredUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinData,
    });

  typia.assert(registeredUser);
  TestValidator.predicate(
    "user registration successful",
    registeredUser.id !== null,
  );
  TestValidator.predicate(
    "user email matches input",
    registeredUser.email === userJoinData.email,
  );
  TestValidator.predicate(
    "user status is active",
    registeredUser.status === "active",
  );

  // Step 2: Verify authentication tokens are valid
  const token: IAuthorizationToken = registeredUser.token;
  typia.assert(token);
  TestValidator.predicate("access token exists", token.access.length > 0);
  TestValidator.predicate("refresh token exists", token.refresh.length > 0);
  TestValidator.predicate(
    "access token expiration is valid date",
    new Date(token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refresh token expiration is valid date",
    new Date(token.refreshable_until).getTime() > Date.now(),
  );

  // Step 3: Call logout endpoint to terminate the session
  const logoutResponse: ITodoAppLogoutResponse =
    await api.functional.todoApp.user.auth.logout(connection);

  typia.assert(logoutResponse);

  // Step 4: Validate logout response confirms successful session termination
  TestValidator.equals(
    "logout success flag is true",
    logoutResponse.success,
    true,
  );
  TestValidator.predicate(
    "logout message is not empty",
    logoutResponse.message.length > 0,
  );
  TestValidator.predicate(
    "logout message contains success indication",
    logoutResponse.message.toLowerCase().includes("success") ||
      logoutResponse.message.toLowerCase().includes("logged out"),
  );
}
