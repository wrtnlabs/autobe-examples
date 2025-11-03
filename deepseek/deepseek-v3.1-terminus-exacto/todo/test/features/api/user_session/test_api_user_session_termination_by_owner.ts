import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test that authenticated users can terminate their own active sessions.
 *
 * This scenario validates the complete session lifecycle: user registration,
 * login to create a session, retrieval of session details, and finally session
 * termination. The test ensures that users can only terminate their own
 * sessions and that terminated sessions are properly marked as expired with
 * updated timestamps.
 */
export async function test_api_user_session_termination_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Login to create an active session
  const loginResponse = await api.functional.todoApp.auth.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://example.com/todo",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loginResponse);

  // Step 3: Retrieve session details to verify it's active
  const session = await api.functional.todoApp.user.users.sessions.at(
    connection,
    {
      userId: user.id,
      sessionId: loginResponse.id,
    },
  );
  typia.assert(session);

  // Verify session is active (expired_at should be null)
  TestValidator.equals(
    "session should be active initially",
    session.expired_at,
    null,
  );

  // Step 4: Terminate the session
  const terminatedSession =
    await api.functional.todoApp.user.users.sessions.erase(connection, {
      userId: user.id,
      sessionId: loginResponse.id,
    });
  typia.assert(terminatedSession);

  // Step 5: Verify session shows expired_at timestamp
  TestValidator.notEquals(
    "session should have expiration timestamp",
    terminatedSession.expired_at,
    null,
  );
  TestValidator.predicate(
    "expiration timestamp should be recent",
    () =>
      new Date(terminatedSession.expired_at!).getTime() > Date.now() - 120000,
  );

  // Step 6: Validate user cannot terminate non-existent sessions
  await TestValidator.error(
    "should fail to terminate non-existent session",
    async () => {
      await api.functional.todoApp.user.users.sessions.erase(connection, {
        userId: user.id,
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
