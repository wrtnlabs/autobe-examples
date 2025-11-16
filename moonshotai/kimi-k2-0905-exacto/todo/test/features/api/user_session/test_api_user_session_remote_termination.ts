import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test that users can terminate sessions on other devices for security
 * purposes. Validates that authenticated users can selectively delete sessions
 * that may be active on other devices, enabling secure multi-device session
 * management and protecting against unauthorized access.
 */
export async function test_api_user_session_remote_termination(
  connection: api.IConnection,
) {
  // Create a user account for testing multi-session scenario
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "1234";

  // Create first user account (establishes initial session)
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user1);

  // Create additional session by logging in again (simulates different device)
  const user2 = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(user2);

  // List all user sessions to identify both active sessions
  const sessionsList = await api.functional.todoApp.user.auth.sessions.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(sessionsList);

  TestValidator.predicate(
    "should have multiple sessions",
    sessionsList.data.length >= 2,
  );

  // Select one session to terminate (simulate remote device session)
  const targetSession = RandomGenerator.pick(sessionsList.data);
  const targetSessionId = targetSession.id;

  // Delete the selected session (remote termination)
  const deletedSession = await api.functional.todoApp.user.auth.sessions.erase(
    connection,
    {
      sessionId: targetSessionId,
    },
  );
  typia.assert(deletedSession);

  TestValidator.equals(
    "deleted session ID should match",
    deletedSession.id,
    targetSessionId,
  );
  TestValidator.equals(
    "deleted session user should match",
    deletedSession.user_id,
    user1.id,
  );

  // Verify the session is no longer in the active sessions list
  const updatedSessionsList =
    await api.functional.todoApp.user.auth.sessions.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(updatedSessionsList);

  TestValidator.predicate(
    "should have one less session",
    updatedSessionsList.data.length === sessionsList.data.length - 1,
  );

  const sessionStillExists = updatedSessionsList.data.some(
    (session) => session.id === targetSessionId,
  );
  TestValidator.predicate(
    "deleted session should not exist in list",
    !sessionStillExists,
  );
}
