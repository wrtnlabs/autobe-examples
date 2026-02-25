import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test combined filtering by date range and IP address partial match.
 * After joining, the user calls the sessions endpoint with multiple filter criteria:
 * created_at_from/created_at_to to filter sessions within a specific time window,
 * and ip parameter for partial IP address matching (case-insensitive).
 * Validates: date range filtering, IP partial matching, AND logic for combined filters,
 * and pagination alongside filters.
 */
export async function test_api_user_session_list_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create user with specific IP address for filtering tests
  const userConnection: api.IConnection = { host: connection.host };
  const testIp = "192.168.1.100";
  const authorized = await authorize_user_join(userConnection, {
    body: {
      ip: testIp,
    },
  });
  typia.assert(authorized);
  // Record approximate session creation time
  const sessionCreatedAt = new Date();
  // Small delay to ensure distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Get all sessions for the user (no filters) - baseline
  const allSessions = await api.functional.todoApp.user.sessions.index(
    userConnection,
    {
      body: {},
    },
  );
  typia.assert(allSessions);
  // Verify the session was created
  TestValidator.predicate(
    "user has at least one session",
    allSessions.data.length >= 1,
  );
  // Find our session with the test IP (use typia.assert with assignment for type narrowing)
  const ourSession = typia.assert(allSessions.data.find((s) => s.ip === testIp)!);
  // Test 1: Date range filter - session should be included (range covers session creation)
  const dateFrom = new Date(
    sessionCreatedAt.getTime() - 1000 * 60 * 60,
  ).toISOString();
  const dateTo = new Date(
    sessionCreatedAt.getTime() + 1000 * 60 * 60,
  ).toISOString();
  const dateRangeSessions = await api.functional.todoApp.user.sessions.index(
    userConnection,
    {
      body: {
        created_at_from: dateFrom,
        created_at_to: dateTo,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(dateRangeSessions);
  TestValidator.predicate(
    "session within date range is returned",
    dateRangeSessions.data.some((s) => s.id === ourSession.id),
  );
  // Test 2: Date range filter - session should be excluded (range before session creation)
  const beforeFrom = new Date(
    sessionCreatedAt.getTime() - 1000 * 60 * 60 * 2,
  ).toISOString();
  const beforeTo = new Date(
    sessionCreatedAt.getTime() - 1000 * 60 * 60,
  ).toISOString();
  const beforeRangeSessions = await api.functional.todoApp.user.sessions.index(
    userConnection,
    {
      body: {
        created_at_from: beforeFrom,
        created_at_to: beforeTo,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(beforeRangeSessions);
  TestValidator.predicate(
    "session outside date range is excluded",
    !beforeRangeSessions.data.some((s) => s.id === ourSession.id),
  );
  // Test 3: IP partial match - should find session
  const ipPartialSessions = await api.functional.todoApp.user.sessions.index(
    userConnection,
    {
      body: {
        ip: "168.1",
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(ipPartialSessions);
  TestValidator.predicate(
    "IP partial match works (substring)",
    ipPartialSessions.data.some((s) => s.id === ourSession.id),
  );
  // Test 4: IP partial match - non-matching IP
  const ipNoMatchSessions = await api.functional.todoApp.user.sessions.index(
    userConnection,
    {
      body: {
        ip: "10.0.0",
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(ipNoMatchSessions);
  TestValidator.predicate(
    "non-matching IP returns empty",
    !ipNoMatchSessions.data.some((s) => s.id === ourSession.id),
  );
  // Test 5: Combined filters (AND logic) - both conditions match
  const combinedSessions = await api.functional.todoApp.user.sessions.index(
    userConnection,
    {
      body: {
        created_at_from: dateFrom,
        created_at_to: dateTo,
        ip: "192",
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(combinedSessions);
  TestValidator.predicate(
    "combined filters with matching conditions returns session",
    combinedSessions.data.some((s) => s.id === ourSession.id),
  );
  // Test 6: Combined filters with partial mismatch (IP doesn't match)
  const combinedMismatchSessions =
    await api.functional.todoApp.user.sessions.index(userConnection, {
      body: {
        created_at_from: dateFrom,
        created_at_to: dateTo,
        ip: "999.999",
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(combinedMismatchSessions);
  TestValidator.predicate(
    "combined filters with one failing condition returns empty",
    !combinedMismatchSessions.data.some((s) => s.id === ourSession.id),
  );
  // Test 7: Pagination with filters
  const paginatedSessions = await api.functional.todoApp.user.sessions.index(
    userConnection,
    {
      body: {
        created_at_from: dateFrom,
        created_at_to: dateTo,
        ip: "192",
        limit: 10,
        page: 1,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(paginatedSessions);
  TestValidator.equals(
    "pagination current page",
    paginatedSessions.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedSessions.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count matches filtered results",
    paginatedSessions.pagination.records >= 1,
  );
  // Test 8: IP case-insensitive partial match
  const ipCaseInsensitiveSessions =
    await api.functional.todoApp.user.sessions.index(userConnection, {
      body: {
        ip: "168.1",
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(ipCaseInsensitiveSessions);
  TestValidator.predicate(
    "IP partial match is case-insensitive",
    ipCaseInsensitiveSessions.data.some((s) => s.id === ourSession.id),
  );
}