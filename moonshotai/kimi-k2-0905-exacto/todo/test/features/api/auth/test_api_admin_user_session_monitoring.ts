import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

export async function test_api_admin_user_session_monitoring(
  connection: api.IConnection,
) {
  // 1. Create admin user account for administrative access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUser = await api.functional.auth.user.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123",
      href: "https://todoapp.example.com/admin/register",
      referrer: "https://todoapp.example.com/",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(adminUser);

  // 2. Authenticate admin to perform session monitoring
  await api.functional.auth.user.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123",
      href: "https://todoapp.example.com/admin/dashboard",
      referrer: "https://todoapp.example.com/admin/register",
    } satisfies ITodoAppUser.ILogin,
  });

  // 3. Create regular user for session monitoring targets
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUser = await api.functional.auth.user.join(connection, {
    body: {
      email: regularUserEmail,
      password: "UserPass123",
      href: "https://todoapp.example.com/register",
      referrer: "https://todoapp.example.com/",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(regularUser);

  // 4. Generate session activity for the target user
  await api.functional.auth.user.login(connection, {
    body: {
      email: regularUserEmail,
      password: "UserPass123",
      href: "https://todoapp.example.com/dashboard",
      referrer: "https://todoapp.example.com/register",
    } satisfies ITodoAppUser.ILogin,
  });

  // 5. Test administrative session monitoring - basic session retrieval
  const sessionRequest = {
    page: 1,
    limit: 10,
  } satisfies ITodoAppUserSession.IRequest;

  const monitoredSessions =
    await api.functional.todoApp.auth.users.sessions.index(connection, {
      userId: regularUser.id,
      body: sessionRequest,
    });
  typia.assert(monitoredSessions);

  // 6. Validate session data structure and content
  TestValidator.predicate(
    "sessions data exists",
    monitoredSessions.data.length > 0,
  );

  const firstSession = monitoredSessions.data[0];
  TestValidator.predicate(
    "session has user_id",
    firstSession.user_id === regularUser.id,
  );
  TestValidator.predicate(
    "session has valid IP",
    typeof firstSession.ip === "string" && firstSession.ip.length > 0,
  );
  TestValidator.predicate(
    "session has valid href",
    typeof firstSession.href === "string" &&
      firstSession.href.includes("https://"),
  );
  TestValidator.predicate(
    "session has valid referrer",
    typeof firstSession.referrer === "string",
  );
  TestValidator.predicate(
    "session has creation timestamp",
    firstSession.created_at.length > 0,
  );

  // 7. Test session filtering with date range
  const dateFilteredRequest = {
    page: 1,
    limit: 5,
    created_at_start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
    created_at_end: new Date().toISOString(),
  } satisfies ITodoAppUserSession.IRequest;

  const dateFilteredSessions =
    await api.functional.todoApp.auth.users.sessions.index(connection, {
      userId: regularUser.id,
      body: dateFilteredRequest,
    });
  typia.assert(dateFilteredSessions);

  TestValidator.predicate(
    "date filtered sessions exist",
    dateFilteredSessions.data.length > 0,
  );
  TestValidator.predicate(
    "pagination info is valid",
    dateFilteredSessions.pagination.records > 0,
  );

  // 8. Test active session filtering
  const activeSessionsRequest = {
    page: 1,
    limit: 10,
    expired_at: false, // false means finding active sessions
  } satisfies ITodoAppUserSession.IRequest;

  const activeSessions = await api.functional.todoApp.auth.users.sessions.index(
    connection,
    {
      userId: regularUser.id,
      body: activeSessionsRequest,
    },
  );
  typia.assert(activeSessions);

  TestValidator.predicate(
    "active sessions returned",
    activeSessions.data.length > 0,
  );
  TestValidator.predicate(
    "active sessions should not have expired_at",
    activeSessions.data.every(
      (session) =>
        session.expired_at === null || session.expired_at === undefined,
    ),
  );

  // 9. Test expired session filtering
  const expiredSessionsRequest = {
    page: 1,
    limit: 10,
    expired_at: true,
  } satisfies ITodoAppUserSession.IRequest;

  const expiredSessions =
    await api.functional.todoApp.auth.users.sessions.index(connection, {
      userId: regularUser.id,
      body: expiredSessionsRequest,
    });
  typia.assert(expiredSessions);

  // 10. Test pagination functionality
  TestValidator.predicate(
    "pagination metadata exists",
    dateFilteredSessions.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is respected",
    dateFilteredSessions.data.length <= 5,
  );
  TestValidator.predicate(
    "total records tracked",
    dateFilteredSessions.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages calculated",
    dateFilteredSessions.pagination.pages > 0,
  );

  // 11. Validate user summary information in sessions
  monitoredSessions.data.forEach((session) => {
    TestValidator.predicate(
      "session has user summary",
      session.user !== undefined,
    );
    TestValidator.predicate(
      "user summary has id",
      session.user.id === regularUser.id,
    );
    TestValidator.predicate(
      "user summary has email",
      session.user.email === regularUserEmail,
    );
  });
}
