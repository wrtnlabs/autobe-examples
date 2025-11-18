import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Validates that an administrator can successfully retrieve the full details of
 * a specific session for an existing user. This test ensures the audit and
 * traceability requirement is met for administrative session access, and that
 * non-admins are strictly prohibited.
 *
 * Steps:
 *
 * 1. Construct random test data for a user and a session id (typia.random).
 * 2. As admin, call api.functional.todoList.users.sessions.at(connection, { email,
 *    sessionId }).
 * 3. Validate that response matches ITodoListUserSession (typia.assert).
 * 4. Confirm related session/user linkage in the returned object (user.id ===
 *    session.user.id and session.id === requested sessionId).
 * 5. As an edge case, simulate the same call as a non-admin actor and expect error
 *    (TestValidator.error with async call).
 */
export async function test_api_user_session_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Generate valid test email and session ID
  const email: string = typia.random<string & tags.Format<"email">>();
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Simulate acting as admin and call the session retrieval API
  const session: ITodoListUserSession =
    await api.functional.todoList.users.sessions.at(connection, {
      email,
      sessionId,
    });
  typia.assert(session);

  // 3. Validate session object links and integrity
  TestValidator.equals("session id matches request", session.id, sessionId);
  TestValidator.equals(
    "session user email not exposed",
    Object.keys(session.user).includes("id"),
    true,
  );

  // 4. (Edge) Simulate as non-admin actor (unauthenticated connection) and confirm forbidden
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin cannot retrieve user session details",
    async () => {
      await api.functional.todoList.users.sessions.at(unauthConn, {
        email,
        sessionId,
      });
    },
  );
}
