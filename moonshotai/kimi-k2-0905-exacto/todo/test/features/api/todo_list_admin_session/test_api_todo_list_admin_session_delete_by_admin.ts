import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate administrative ability to revoke a specific user session for the
 * todo-list system.
 *
 * 1. Register a new admin via /auth/admin/join and obtain the authorized token and
 *    user id.
 * 2. Register a second admin using /auth/admin/join as the user to be "targeted".
 * 3. Using the first admin's session, perform DELETE
 *    /todoList/admin/users/{userId}/sessions/{sessionId} for the second admin's
 *    userId/session token.
 * 4. Validate deletion proceeds with no error.
 * 5. Attempt an access using the revoked session's access token (from the deleted
 *    session) - expecting it to be denied (e.g., by 401/403 or generic error).
 * 6. Attempt to delete an already non-existent session and expect error (404 or
 *    equivalent handled).
 * 7. Attempt to perform deletion as a non-admin (no token or an invalid/expired
 *    one) and expect error (401/403).
 */
export async function test_api_todo_list_admin_session_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register first admin (will perform session deletions)
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://test.admin.app/registration",
    referrer: "https://test.admin.app/login",
  } satisfies ITodoListAdmin.IJoin;
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(admin);

  // 2. Register a second admin user (session to be revoked)
  const victimJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://test.admin.app/registration",
    referrer: "https://test.admin.app/login",
  } satisfies ITodoListAdmin.IJoin;
  const victim: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: victimJoinInput });
  typia.assert(victim);

  // 3. As the "master" admin, DELETE the victim session
  await api.functional.todoList.admin.users.sessions.erase(connection, {
    userId: victim.id,
    sessionId: victim.token.access as string & tags.Format<"uuid">,
  });

  // 4. Try to perform any API call using the deleted session's access token — expect a failure
  // (Simulating victim admin losing access; use their connection and expect error)
  const victimConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: victim.token.access },
  };
  await TestValidator.error(
    "revoked session should be immediately invalidated",
    async () => {
      // Try any privileged admin API, such as a duplicate join (will fail by conflict, but should fail earlier)
      await api.functional.todoList.admin.users.sessions.erase(
        victimConnection,
        {
          userId: victim.id,
          sessionId: victim.token.access as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 5. Try to delete the session again (which now is deleted/non-existent) — expect error (404 or similar)
  await TestValidator.error(
    "deleting a non-existent session should fail",
    async () => {
      await api.functional.todoList.admin.users.sessions.erase(connection, {
        userId: victim.id,
        sessionId: victim.token.access as string & tags.Format<"uuid">,
      });
    },
  );

  // 6. Try to perform the session delete as non-admin (no token supplied) — expect error (401/403)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin should not be able to delete sessions",
    async () => {
      await api.functional.todoList.admin.users.sessions.erase(unauthConn, {
        userId: victim.id,
        sessionId: victim.token.access as string & tags.Format<"uuid">,
      });
    },
  );
}
