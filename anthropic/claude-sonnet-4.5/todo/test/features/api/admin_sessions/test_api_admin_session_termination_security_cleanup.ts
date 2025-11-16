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
 * Test session deletion for security-enforced logout scenarios where sessions
 * must be terminated for security reasons such as suspicious activity detection
 * or compromised credentials.
 *
 * This scenario validates:
 *
 * 1. Admin account creation and authentication
 * 2. Session establishment and verification
 * 3. Immediate session termination through the delete operation
 * 4. Verification that the terminated session can no longer be used for
 *    authentication or retrieved
 *
 * This tests the security workflow where sessions are forcibly revoked,
 * ensuring that once deleted, the session is completely invalidated and cannot
 * be recovered or reused, which is critical for security incident response and
 * unauthorized access prevention.
 */
export async function test_api_admin_session_termination_security_cleanup(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
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

  // Step 2: Retrieve sessions to identify the current session
  const sessionsPage: IPageITodoListAdminSession.ISummary =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {} satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(sessionsPage);

  // Verify at least one session exists
  TestValidator.predicate(
    "admin should have at least one active session",
    sessionsPage.data.length > 0,
  );

  // Get the first session (current session)
  const currentSession = sessionsPage.data[0];
  typia.assert(currentSession!);

  // Step 3: Terminate the session through delete operation
  const deletedSession: ITodoListAdminSession =
    await api.functional.todoList.admin.admins.sessions.erase(connection, {
      adminId: admin.id,
      sessionId: currentSession.id,
    });
  typia.assert(deletedSession);

  // Step 4: Verify the session was deleted by checking it's the same session
  TestValidator.equals(
    "deleted session ID matches the target session",
    deletedSession.id,
    currentSession.id,
  );

  // Step 5: Verify the session no longer appears in the session list
  const updatedSessionsPage: IPageITodoListAdminSession.ISummary =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {} satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(updatedSessionsPage);

  // Verify the deleted session is no longer in the list
  const foundDeletedSession = updatedSessionsPage.data.find(
    (session) => session.id === currentSession.id,
  );

  TestValidator.equals(
    "deleted session should not be found in session list",
    foundDeletedSession,
    undefined,
  );
}
