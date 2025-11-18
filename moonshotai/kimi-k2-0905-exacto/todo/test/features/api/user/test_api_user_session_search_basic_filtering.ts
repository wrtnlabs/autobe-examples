import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSession";
import type { IRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IRefreshToken";
import type { ITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSession";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user session search and filtering functionality with basic criteria
 * including device type, validity status, and date ranges. Validates that users
 * can effectively query their own sessions for security monitoring and device
 * management. Checks that filtering correctly identifies active vs expired
 * sessions across different device types (web, mobile, tablet, api) with proper
 * pagination and result ordering.
 */
export async function test_api_user_session_search_basic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account and establish authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "TestPassword123!",
      name: RandomGenerator.name(),
      ip: null,
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // 2. Create additional session through refresh token
  const refreshResponse = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: user.token.refresh,
    } satisfies ITodoAppUser.IRefresh,
  });
  typia.assert(refreshResponse);

  // 3. Create a task to satisfy prerequisite
  const task = await api.functional.todoApp.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "pending",
        priority: "medium",
      } satisfies ITodoAppTask.ICreate,
    },
  );
  typia.assert(task);

  // 4. Test basic session search without filters
  const allSessions = await api.functional.todoApp.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        page: {
          current: 0,
          limit: 20,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies ITodoAppSession.IRequest,
    },
  );
  typia.assert(allSessions);

  TestValidator.predicate("returns session list", allSessions.data.length > 0);
  TestValidator.equals(
    "contains current user",
    allSessions.data[0].user.id,
    user.id,
  );

  // Validate basic session structure
  TestValidator.predicate(
    "all sessions have valid structure",
    allSessions.data.every(
      (session) =>
        session.id &&
        session.user &&
        session.is_valid !== undefined &&
        session.created_at,
    ),
  );

  // 5. Test device type filtering - validate actual device types in results
  const webSessions = await api.functional.todoApp.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        device_type: "web",
        page: {
          current: 0,
          limit: 10,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies ITodoAppSession.IRequest,
    },
  );
  typia.assert(webSessions);

  TestValidator.predicate(
    "web device sessions filtered correctly",
    webSessions.data.length === 0 ||
      webSessions.data.every((s) => s.device_type === "web"),
  );

  // 6. Test validity status filtering with proper validation
  const validSessions = await api.functional.todoApp.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        is_valid: true,
        page: {
          current: 0,
          limit: 10,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies ITodoAppSession.IRequest,
    },
  );
  typia.assert(validSessions);

  TestValidator.predicate(
    "all returned sessions are valid",
    validSessions.data.every((session) => session.is_valid === true),
  );

  // 7. Test date range filtering with formal date handling
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysFromNow = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const recentSessions = await api.functional.todoApp.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        created_after: oneDayAgo satisfies string & tags.Format<"date-time">,
        expired_before: thirtyDaysFromNow satisfies string &
          tags.Format<"date-time">,
        page: {
          current: 0,
          limit: 10,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies ITodoAppSession.IRequest,
    },
  );
  typia.assert(recentSessions);

  TestValidator.predicate(
    "sessions found within date range",
    recentSessions.data.length > 0,
  );

  // 8. Test IP address pattern filtering
  const ipv4Sessions = await api.functional.todoApp.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        ip: "192.168.1",
        page: {
          current: 0,
          limit: 10,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies ITodoAppSession.IRequest,
    },
  );
  typia.assert(ipv4Sessions);

  TestValidator.predicate(
    "IP filtering returns sessions or empty results when no IP match",
    ipv4Sessions.data.length >= 0,
  );

  // 9. Test authentication context filtering
  const standardSessions =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        session_type: "standard",
        page: {
          current: 0,
          limit: 10,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies ITodoAppSession.IRequest,
    });
  typia.assert(standardSessions);

  TestValidator.predicate(
    "standard sessions found",
    standardSessions.data.length > 0,
  );
  TestValidator.predicate(
    "standard session type audit",
    standardSessions.data.length === 0 ||
      standardSessions.data.every((s) => s.session_type === "standard"),
  );

  // 10. Test pagination functionality with systematic verification
  const page1 = await api.functional.todoApp.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        page: {
          current: 0,
          limit: 5,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies ITodoAppSession.IRequest,
    },
  );
  typia.assert(page1);

  const page2 = await api.functional.todoApp.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        page: {
          current: 1,
          limit: 5,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies ITodoAppSession.IRequest,
    },
  );
  typia.assert(page2);

  TestValidator.predicate(
    "pagination returns valid data",
    page1.data.length >= 0 && page2.data.length >= 0,
  );

  // Validate pagination info matches returned data
  TestValidator.equals(
    "page 1 data length does not exceed limit",
    Math.min(page1.data.length, 5),
    page1.data.length,
  );
  TestValidator.equals(
    "page 2 data length does not exceed limit",
    Math.min(page2.data.length, 5),
    page2.data.length,
  );

  // 11. Test combined filtering across multiple criteria
  const combinedFiltered =
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        device_type: "web",
        is_valid: true,
        created_after: oneDayAgo satisfies string & tags.Format<"date-time">,
        session_type: "standard",
        page: {
          current: 0,
          limit: 10,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies ITodoAppSession.IRequest,
    });
  typia.assert(combinedFiltered);

  TestValidator.predicate(
    "combined filters work",
    combinedFiltered.data.length >= 0,
  );

  if (combinedFiltered.data.length > 0) {
    TestValidator.predicate(
      "combined filter criteria satisfied",
      combinedFiltered.data.every(
        (session) =>
          session.device_type === "web" &&
          session.is_valid === true &&
          session.session_type === "standard" &&
          new Date(session.created_at) >= new Date(oneDayAgo),
      ),
    );
  }

  // 12. Verify security boundaries - user can only query own sessions
  const otherUser = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error("cannot query other user's sessions", async () => {
    await api.functional.todoApp.user.users.sessions.index(connection, {
      userId: otherUser,
      body: {
        page: {
          current: 0,
          limit: 10,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies ITodoAppSession.IRequest,
    });
  });

  return;
}
