import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate that deleting a non-existent admin session fails without affecting
 * existing sessions.
 *
 * Business context:
 *
 * - Admin users authenticate via adminUser flows that create rows in
 *   todo_app_adminusers and todo_app_adminuser_sessions.
 * - Security tooling or admin consoles may attempt to terminate specific sessions
 *   by id.
 * - When a client targets a sessionId that does not exist for the given
 *   adminUserId, the backend must respond with a clear error and must not
 *   accidentally delete other sessions.
 *
 * What this test validates:
 *
 * 1. An admin user can be registered via POST /auth/adminUser/join and receives an
 *    ITodoAppAdminUser.IAuthorized payload with a valid id and token.
 * 2. Calling DELETE
 *    /todoApp/adminUser/adminUsers/{adminUserId}/sessions/{sessionId} with a
 *    fabricated non-existent sessionId for that admin results in an error
 *    instead of a silent success.
 * 3. Repeated attempts using other non-existent sessionIds also fail,
 *    demonstrating consistent behavior.
 *
 * Due to API surface limitations, this test cannot directly inspect the
 * todo_app_adminuser_sessions table. Instead, it focuses on HTTP-level
 * behavior: ensuring that erase() does not succeed when the targeted session
 * row does not exist.
 */
export async function test_api_admin_session_delete_for_nonexistent_session(
  connection: api.IConnection,
) {
  // 1. Register an admin user and obtain authorized context (includes token and id).
  const joinInput = typia.random<ITodoAppAdminUser.IJoin>();

  const authorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinInput,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(authorized);

  const adminUserId = authorized.id;

  // 2. Generate fabricated non-existent session IDs.
  const fakeSessionId1 = typia.random<string & tags.Format<"uuid">>();
  const fakeSessionId2 = typia.random<string & tags.Format<"uuid">>();

  // 3. First deletion attempt with a non-existent session ID should fail.
  await TestValidator.error(
    "deleting non-existent admin session should fail",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.sessions.erase(
        connection,
        {
          adminUserId,
          sessionId: fakeSessionId1,
        },
      );
    },
  );

  // 4. Second deletion attempt with another non-existent session ID should also fail.
  await TestValidator.error(
    "repeated deletion attempts of non-existent session should consistently fail",
    async () => {
      await api.functional.todoApp.adminUser.adminUsers.sessions.erase(
        connection,
        {
          adminUserId,
          sessionId: fakeSessionId2,
        },
      );
    },
  );
}
