import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Comprehensive session search functionality test with various filtering
 * options.
 *
 * Validates that users can search their authentication sessions using multiple
 * criteria including IP address filtering, date ranges, expiration status, and
 * sorting options. Tests pagination functionality and ensures search results
 * match filter criteria correctly.
 */
export async function test_api_user_session_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // 2. Create multiple sessions with different connection details
  const sessions: ITodoListUserSession[] = [];

  // Session 1: Current session with specific IP
  const session1 = await api.functional.todoList.users.sessions.create(
    connection,
    {
      userId: user.id,
      body: {
        ip: "192.168.1.100",
        href: "https://app.example.com/dashboard",
        referrer: "https://app.example.com/login",
      } satisfies ITodoListUserSession.ICreate,
    },
  );
  typia.assert(session1);
  sessions.push(session1);

  // Session 2: Different IP and URL
  const session2 = await api.functional.todoList.users.sessions.create(
    connection,
    {
      userId: user.id,
      body: {
        ip: "10.0.0.50",
        href: "https://app.example.com/profile",
        referrer: "https://app.example.com/dashboard",
      } satisfies ITodoListUserSession.ICreate,
    },
  );
  typia.assert(session2);
  sessions.push(session2);

  // Session 3: Another IP pattern
  const session3 = await api.functional.todoList.users.sessions.create(
    connection,
    {
      userId: user.id,
      body: {
        ip: "172.16.1.200",
        href: "https://app.example.com/settings",
        referrer: "https://app.example.com/profile",
      } satisfies ITodoListUserSession.ICreate,
    },
  );
  typia.assert(session3);
  sessions.push(session3);

  // 3. Test IP filtering with partial matching
  const ipFilterResult =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        ip: "192.168",
        page: 1,
        limit: 10,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(ipFilterResult);

  TestValidator.equals(
    "IP filter should return sessions matching IP pattern",
    ipFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "Filtered session should match the IP pattern",
    ipFilterResult.data[0].ip.includes("192.168"),
    true,
  );

  // 4. Test date range filtering
  const startDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
  const endDate = new Date().toISOString(); // Now

  const dateFilterResult =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        created_at_start: startDate,
        created_at_end: endDate,
        page: 1,
        limit: 10,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(dateFilterResult);

  TestValidator.predicate(
    "Date filter should return sessions within time range",
    dateFilterResult.data.length > 0,
  );

  // 5. Test expiration status filtering (active sessions)
  const activeSessionsResult =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        expired: false,
        page: 1,
        limit: 10,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(activeSessionsResult);

  TestValidator.predicate(
    "Active sessions filter should return sessions without expiration",
    activeSessionsResult.data.every(
      (session) => session.expired_at === undefined,
    ),
  );

  // 6. Test sorting by creation date (descending)
  const sortedResult = await api.functional.todoList.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        order_by: "created_at",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies ITodoListUserSession.IRequest,
    },
  );
  typia.assert(sortedResult);

  TestValidator.predicate(
    "Sessions should be sorted by creation date descending",
    sortedResult.data.length > 1
      ? new Date(sortedResult.data[0].created_at) >=
          new Date(sortedResult.data[1].created_at)
      : true,
  );

  // 7. Test pagination with different page sizes
  const paginationResult1 =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 2,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(paginationResult1);

  TestValidator.equals(
    "First page with limit 2 should return exactly 2 sessions",
    paginationResult1.data.length,
    2,
  );

  const paginationResult2 =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: 2,
        limit: 2,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(paginationResult2);

  TestValidator.equals(
    "Second page should return remaining sessions",
    paginationResult2.data.length,
    1,
  );

  // 8. Test pagination metadata
  TestValidator.equals(
    "Pagination should show correct total records",
    paginationResult1.pagination.records,
    sessions.length,
  );
  TestValidator.equals(
    "Pagination should show correct current page",
    paginationResult1.pagination.current,
    1,
  );
  TestValidator.equals(
    "Pagination should show correct limit",
    paginationResult1.pagination.limit,
    2,
  );

  // 9. Test empty filter (should return all sessions)
  const allSessionsResult =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(allSessionsResult);

  TestValidator.equals(
    "Empty filter should return all user sessions",
    allSessionsResult.data.length,
    sessions.length,
  );

  // 10. Test combination of multiple filters
  const combinedFilterResult =
    await api.functional.todoList.user.users.sessions.index(connection, {
      userId: user.id,
      body: {
        ip: "10.0",
        expired: false,
        order_by: "created_at",
        order: "asc",
        page: 1,
        limit: 5,
      } satisfies ITodoListUserSession.IRequest,
    });
  typia.assert(combinedFilterResult);

  TestValidator.predicate(
    "Combined filter should return matching sessions",
    combinedFilterResult.data.length > 0,
  );
}
