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
 * Test session termination when an administrator has multiple concurrent active
 * sessions.
 *
 * This test validates that deleting one session does not affect other active
 * sessions for the same administrator, ensuring proper session isolation and
 * granular deletion.
 *
 * Workflow:
 *
 * 1. Register a new admin account
 * 2. Create multiple sessions by performing multiple login operations
 * 3. Retrieve all active sessions to verify multiple sessions exist
 * 4. Delete one specific session
 * 5. Verify the deleted session no longer exists
 * 6. Verify other sessions remain active and accessible
 */
export async function test_api_admin_session_termination_multiple_sessions(
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

  // Step 2: Create multiple sessions by performing multiple login operations
  const session1: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ILogin,
    });
  typia.assert(session1);

  const session2: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ILogin,
    });
  typia.assert(session2);

  const session3: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ILogin,
    });
  typia.assert(session3);

  // Step 3: Retrieve all active sessions to verify multiple sessions exist
  const sessionsPage: IPageITodoListAdminSession.ISummary =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {} satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(sessionsPage);

  TestValidator.predicate(
    "should have at least 4 sessions (1 from registration + 3 from logins)",
    sessionsPage.data.length >= 4,
  );

  // Step 4: Delete one specific session
  const sessionToDelete = sessionsPage.data[0];
  const deletedSession: ITodoListAdminSession =
    await api.functional.todoList.admin.admins.sessions.erase(connection, {
      adminId: admin.id,
      sessionId: sessionToDelete.id,
    });
  typia.assert(deletedSession);

  TestValidator.equals(
    "deleted session ID should match",
    deletedSession.id,
    sessionToDelete.id,
  );

  // Step 5: Verify the deleted session no longer exists
  await TestValidator.error(
    "deleted session should not be retrievable",
    async () => {
      await api.functional.todoList.admin.admins.sessions.at(connection, {
        adminId: admin.id,
        sessionId: sessionToDelete.id,
      });
    },
  );

  // Step 6: Verify other sessions remain active and accessible
  const remainingSessions = sessionsPage.data.filter(
    (s) => s.id !== sessionToDelete.id,
  );

  for (const session of remainingSessions) {
    const activeSession: ITodoListAdminSession =
      await api.functional.todoList.admin.admins.sessions.at(connection, {
        adminId: admin.id,
        sessionId: session.id,
      });
    typia.assert(activeSession);

    TestValidator.equals(
      `remaining session ${session.id} should still be accessible`,
      activeSession.id,
      session.id,
    );
  }

  // Verify the session count after deletion
  const updatedSessionsPage: IPageITodoListAdminSession.ISummary =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {} satisfies ITodoListAdminSession.IRequest,
    });
  typia.assert(updatedSessionsPage);

  TestValidator.equals(
    "session count should be reduced by 1",
    updatedSessionsPage.data.length,
    sessionsPage.data.length - 1,
  );
}
