import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdminSession";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Test successful termination of an administrator's active session through
 * explicit logout.
 *
 * This test validates the complete session lifecycle:
 *
 * 1. Admin registration and authentication
 * 2. Session creation and retrieval
 * 3. Session deletion (logout)
 * 4. Verification that the session no longer exists
 *
 * This ensures proper session cleanup and authentication state management.
 */
export async function test_api_admin_session_termination_successful(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Retrieve the admin's sessions
  const sessionList: IPageITodoListAdminSession.ISummary =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {} satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(sessionList);

  // Step 3: Verify at least one session exists
  TestValidator.predicate(
    "admin should have at least one active session",
    sessionList.data.length > 0,
  );

  // Step 4: Get the first session ID
  const firstSession = sessionList.data[0];
  typia.assertGuard(firstSession!);

  // Step 5: Delete the session (logout)
  const deletedSession: ITodoListAdminSession =
    await api.functional.todoList.admin.admins.sessions.erase(connection, {
      adminId: admin.id,
      sessionId: firstSession.id,
    });
  typia.assert(deletedSession);

  // Step 6: Verify the deleted session matches the original
  TestValidator.equals(
    "deleted session ID should match",
    deletedSession.id,
    firstSession.id,
  );

  // Step 7: Retrieve sessions again to verify deletion
  const updatedSessionList: IPageITodoListAdminSession.ISummary =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {} satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(updatedSessionList);

  // Step 8: Verify the session is no longer in the list
  const sessionStillExists = updatedSessionList.data.some(
    (session) => session.id === firstSession.id,
  );
  TestValidator.predicate(
    "deleted session should not exist in session list",
    !sessionStillExists,
  );
}
