import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test deletion of an administrative session by an authenticated admin.
 *
 * 1. Register a new admin account to establish a unique admin context
 * 2. Authenticate as this new admin to create a JWT-authenticated session
 * 3. Use the admin's id and the session's access token as identifiers for the
 *    session
 * 4. Call the admin session deletion endpoint, providing the correct adminId and
 *    sessionId (token string)
 * 5. Verify that no errors occur and the operation succeeds (void return)
 * 6. Try to delete the same session again, and check that an appropriate error is
 *    thrown
 * 7. Attempt to delete a session with mismatched adminId or random sessionId, and
 *    verify error handling
 * 8. Optionally: Check that a new admin (created fresh) cannot delete sessions
 *    they do not own
 * 9. (Cannot inspect audit logs directly, but ensure no type error or ghost
 *    session left)
 */
export async function test_api_admin_session_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and sign in as new admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies ITodoListAdmin.IJoin;
  const joined: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(joined);
  const adminId = joined.id;
  const sessionId = joined.token.access;

  // 2. Delete session as the valid admin
  await api.functional.todoList.admin.admins.sessions.erase(connection, {
    adminId: adminId,
    sessionId: sessionId,
  });

  // 3. Deleting again should error
  await TestValidator.error(
    "deleting an already deleted session should fail",
    async () => {
      await api.functional.todoList.admin.admins.sessions.erase(connection, {
        adminId: adminId,
        sessionId: sessionId,
      });
    },
  );

  // 4. Try deleting with wrong adminId
  await TestValidator.error("using wrong adminId must fail", async () => {
    const randomAdminId = typia.random<string & tags.Format<"uuid">>();
    await api.functional.todoList.admin.admins.sessions.erase(connection, {
      adminId: randomAdminId,
      sessionId: sessionId,
    });
  });
  // 5. Try deleting with wrong sessionId
  await TestValidator.error("using wrong sessionId must fail", async () => {
    const randomSessionId = typia.random<string>();
    await api.functional.todoList.admin.admins.sessions.erase(connection, {
      adminId: adminId,
      sessionId: randomSessionId as string & tags.Format<"uuid">, // purposely wrong format, will produce error
    });
  });
  // 6. Ensure a different admin cannot delete other's session
  const joinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies ITodoListAdmin.IJoin;
  const joined2 = await api.functional.auth.admin.join(connection, {
    body: joinBody2,
  });
  typia.assert(joined2);
  const otherAdminId = joined2.id;
  await TestValidator.error(
    "different admin cannot delete other's session",
    async () => {
      await api.functional.todoList.admin.admins.sessions.erase(connection, {
        adminId: otherAdminId,
        sessionId: sessionId,
      });
    },
  );
}
