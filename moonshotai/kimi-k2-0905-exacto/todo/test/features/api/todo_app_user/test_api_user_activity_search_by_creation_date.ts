import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test searching user activity by creation date range.
 *
 * This test validates the user activity search functionality with date-based
 * filtering. It creates a user account, generates multiple login sessions at
 * different times, and tests various date range filtering scenarios including
 * pagination and chronological ordering.
 *
 * 1. Create new user account
 * 2. Perform multiple login operations to create sessions at different times
 * 3. Search for sessions with specific date range filters
 * 4. Validate pagination with different page sizes
 * 5. Verify chronological ordering of results
 * 6. Test edge cases including empty results and invalid parameters
 */
export async function test_api_user_activity_search_by_creation_date(
  connection: api.IConnection,
) {
  // Step 1: Create new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      href: "https://example.com/todo",
      referrer: "https://example.com/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create multiple login sessions at different times
  const loginTimes: string[] = [];

  // First login session
  const loginTime1 = new Date().toISOString();
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      href: "https://example.com/todo",
      referrer: "https://example.com/login",
    } satisfies ITodoAppUser.ILogin,
  });
  loginTimes.push(loginTime1);

  // Wait and create second session
  await new Promise((resolve) => setTimeout(resolve, 100));
  const loginTime2 = new Date().toISOString();
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      href: "https://example.com/todo",
      referrer: "https://example.com/dashboard",
    } satisfies ITodoAppUser.ILogin,
  });
  loginTimes.push(loginTime2);

  // Wait and create third session
  await new Promise((resolve) => setTimeout(resolve, 100));
  const loginTime3 = new Date().toISOString();
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      href: "https://example.com/todo",
      referrer: "https://example.com/profile",
    } satisfies ITodoAppUser.ILogin,
  });
  loginTimes.push(loginTime3);

  // Step 3: Search for all sessions (no date filter)
  const allSessionsResponse =
    await api.functional.todoApp.user.auth.users.activity.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(allSessionsResponse);

  TestValidator.equals(
    "should have at least 4 sessions (1 join + 3 logins)",
    allSessionsResponse.data.length >= 4,
    true,
  );

  // Step 4: Search with date range filter - sessions from last minute
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60000).toISOString();
  const futureTime = now.toISOString();

  const recentSessionsResponse =
    await api.functional.todoApp.user.auth.users.activity.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        created_at_start: oneMinuteAgo,
        created_at_end: futureTime,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(recentSessionsResponse);

  TestValidator.equals(
    "recent sessions should be found",
    recentSessionsResponse.data.length > 0,
    true,
  );

  // Step 5: Test pagination with smaller page size
  const paginatedResponse =
    await api.functional.todoApp.user.auth.users.activity.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 2,
        created_at_start: oneMinuteAgo,
        created_at_end: futureTime,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(paginatedResponse);

  TestValidator.equals(
    "pagination should work correctly",
    paginatedResponse.data.length <= 2,
    true,
  );
  TestValidator.equals(
    "pagination info should be present",
    paginatedResponse.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "should have pagination metadata",
    () => paginatedResponse.pagination.records > 0,
  );

  // Step 6: Test second page
  if (paginatedResponse.pagination.pages > 1) {
    const secondPageResponse =
      await api.functional.todoApp.user.auth.users.activity.index(connection, {
        userId: user.id,
        body: {
          page: 2,
          limit: 2,
          created_at_start: oneMinuteAgo,
          created_at_end: futureTime,
        } satisfies ITodoAppUserSession.IRequest,
      });
    typia.assert(secondPageResponse);

    TestValidator.equals(
      "second page should have different data",
      secondPageResponse.pagination.current,
      2,
    );
  }

  // Step 7: Test chronological ordering (sessions should be ordered by creation time)
  TestValidator.predicate("sessions should be in chronological order", () => {
    for (let i = 1; i < paginatedResponse.data.length; i++) {
      const prevTime = new Date(
        paginatedResponse.data[i - 1].created_at,
      ).getTime();
      const currTime = new Date(paginatedResponse.data[i].created_at).getTime();
      if (currTime < prevTime) return false;
    }
    return true;
  });

  // Step 8: Test empty date range (no sessions should match)
  const farFutureStart = new Date(now.getTime() + 86400000).toISOString(); // Tomorrow
  const farFutureEnd = new Date(now.getTime() + 172800000).toISOString(); // Day after tomorrow

  const emptyRangeResponse =
    await api.functional.todoApp.user.auth.users.activity.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        created_at_start: farFutureStart,
        created_at_end: farFutureEnd,
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(emptyRangeResponse);

  TestValidator.equals(
    "empty date range should return no sessions",
    emptyRangeResponse.data.length,
    0,
  );

  // Step 9: Test expired session filtering
  const withExpiredFilterResponse =
    await api.functional.todoApp.user.auth.users.activity.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        expired_at: false, // Only active (non-expired) sessions
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(withExpiredFilterResponse);

  // Current sessions should be active (not expired)
  TestValidator.predicate(
    "current sessions should be in active results",
    () => withExpiredFilterResponse.data.length > 0,
  );

  // Step 10: Verify session data integrity
  TestValidator.predicate("all sessions should belong to the user", () => {
    return paginatedResponse.data.every(
      (session) => session.user_id === user.id,
    );
  });

  TestValidator.predicate("each session should have required fields", () => {
    return paginatedResponse.data.every(
      (session) => session.id && session.user_id && session.created_at,
    );
  });

  // Step 11: Test edge case with invalid parameters (should handle gracefully)
  const invalidRangeResponse =
    await api.functional.todoApp.user.auth.users.activity.index(connection, {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        created_at_start: futureTime, // Start after end
        created_at_end: oneMinuteAgo, // End before start
      } satisfies ITodoAppUserSession.IRequest,
    });
  typia.assert(invalidRangeResponse);

  // Should return empty results when start > end
  TestValidator.equals(
    "invalid date range should return empty results",
    invalidRangeResponse.data.length,
    0,
  );

  // Step 12: Test session content validation
  TestValidator.predicate("sessions should have consistent structure", () => {
    return paginatedResponse.data.every((session) => {
      // Validate UUID format for ID fields
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return (
        uuidRegex.test(session.id) &&
        uuidRegex.test(session.user_id) &&
        session.created_at &&
        session.created_at.includes("T")
      );
    });
  });

  // Step 13: Test pagination metadata consistency
  TestValidator.predicate("pagination metadata should be consistent", () => {
    const { pagination, data } = allSessionsResponse;
    return (
      pagination.records >= data.length &&
      pagination.pages >= pagination.current &&
      pagination.limit > 0 &&
      pagination.records >= 0
    );
  });
}
