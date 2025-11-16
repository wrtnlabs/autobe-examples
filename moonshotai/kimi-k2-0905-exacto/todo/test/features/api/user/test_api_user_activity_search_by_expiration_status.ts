import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

export async function test_api_user_activity_search_by_expiration_status(
  connection: api.IConnection,
) {
  // 1. Create user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      href: "https://test.example.com/register",
      referrer: "https://test.example.com/home",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // 2. Create multiple login sessions by logging in repeatedly
  const sessions: ITodoAppUser.IAuthorized[] = await ArrayUtil.asyncRepeat(
    5,
    async () => {
      return await api.functional.auth.user.login(connection, {
        body: {
          email: userEmail,
          password: "testPassword123",
          href: "https://test.example.com/login",
          referrer: "https://test.example.com/home",
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );
  typia.assert(sessions);

  // 3. Search for active sessions (expired_at: false)
  const activeSessionsPage =
    await api.functional.todoApp.user.auth.users.activity.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        expired_at: false,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(activeSessionsPage);

  // 4. Verify active sessions filter returns only sessions without expired_at
  TestValidator.predicate("active sessions should not have expired_at", () => {
    return activeSessionsPage.data.every(
      (session) => session.expired_at === undefined,
    );
  });
  TestValidator.equals(
    "active sessions count matches",
    activeSessionsPage.pagination.records > 0,
    true,
  );

  // 5. Search for expired sessions (expired_at: true)
  const expiredSessionsPage =
    await api.functional.todoApp.user.auth.users.activity.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        expired_at: true,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(expiredSessionsPage);

  // 6. Verify expired sessions filter returns only sessions with expired_at
  TestValidator.predicate("expired sessions should have expired_at", () => {
    return expiredSessionsPage.data.every(
      (session) => session.expired_at !== undefined,
    );
  });

  // 7. Test combined filtering with pagination
  const paginatedActiveSessions =
    await api.functional.todoApp.user.auth.users.activity.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 3,
        expired_at: false,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(paginatedActiveSessions);

  // 8. Verify pagination works correctly with expiration filtering
  TestValidator.predicate("paginated active sessions respect limit", () => {
    return paginatedActiveSessions.data.length <= 3;
  });
  TestValidator.predicate("paginated active sessions are all active", () => {
    return paginatedActiveSessions.data.every(
      (session) =>
        session.expired_at === undefined && session.user_id === user.id,
    );
  });

  // 9. Test with date range filtering and expiration status
  const dateRangeActiveSessions =
    await api.functional.todoApp.user.auth.users.activity.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        expired_at: false,
        created_at_start: new Date(
          Date.now() - 24 * 60 * 60 * 1000,
        ).toISOString(), // 24 hours ago
        created_at_end: new Date().toISOString(),
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(dateRangeActiveSessions);

  // 10. Verify combined filter works correctly
  TestValidator.predicate("date range active sessions are valid", () => {
    return dateRangeActiveSessions.data.every(
      (session) =>
        session.expired_at === undefined && session.user_id === user.id,
    );
  });
}
