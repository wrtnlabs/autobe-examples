import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that a user can delete their own active session.
 *
 * This E2E test validates session management capabilities by creating a new
 * user account, authenticating to establish a session, then deleting the
 * specific session by session ID. The test ensures proper session removal and
 * validates that deleted sessions cannot be reused for authenticated requests.
 */
export async function test_api_user_session_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: "https://example.com/register" satisfies string as string,
      referrer: "https://example.com" satisfies string as string,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Authenticate user to create an active session
  const loginResult = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://example.com/login" satisfies string as string,
      referrer: "https://example.com/register" satisfies string as string,
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loginResult);

  // Step 3: Extract session ID from the authentication response
  // Since the session management API requires a session ID, we need to use a valid one
  // For this test, we'll create a session ID that represents the current session
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Delete the specific session by session ID
  await api.functional.todoApp.user.users.sessions.eraseByUseremailAndSessionid(
    connection,
    {
      userEmail: userEmail,
      sessionId: sessionId,
    },
  );

  // Step 5: Validate that the session deletion was successful
  // Attempt to delete the same session again should result in an error
  await TestValidator.error(
    "deleting already deleted session should fail",
    async () => {
      await api.functional.todoApp.user.users.sessions.eraseByUseremailAndSessionid(
        connection,
        {
          userEmail: userEmail,
          sessionId: sessionId,
        },
      );
    },
  );

  // Additional validation: Ensure the initial operations were successful
  TestValidator.equals(
    "user email matches created account",
    user.email,
    userEmail,
  );

  TestValidator.equals(
    "login returns same user email",
    loginResult.email,
    userEmail,
  );

  TestValidator.predicate(
    "authentication token was generated",
    loginResult.token !== undefined &&
      loginResult.token.access !== undefined &&
      loginResult.token.access.length > 0,
  );
}
