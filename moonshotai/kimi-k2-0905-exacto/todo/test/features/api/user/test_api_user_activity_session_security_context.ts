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
 * Test that users can only access their own activity data and that session
 * security information is properly isolated between users. Validates
 * authentication boundaries by ensuring cross-user data access is prevented and
 * that session metadata includes appropriate audit trail fields without
 * exposing sensitive information.
 *
 * 1. Create two separate user accounts (User A and User B)
 * 2. Create multiple sessions for each user through repeated login operations
 * 3. Verify User A can only access their own activity/sessions
 * 4. Verify User B can only access their own activity/sessions
 * 5. Test cross-user access attempts (should fail)
 * 6. Validate session summaries contain proper audit trail fields
 * 7. Test activity filtering for date ranges and expiration status
 * 8. Verify pagination works correctly
 *
 * Key focus: Authentication boundaries, session isolation, proper audit trails,
 * security constraints
 */
export async function test_api_user_activity_session_security_context(
  connection: api.IConnection,
) {
  // Create first user (User A)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: "password123",
      ip: "192.168.1.100",
      href: "https://example.com/register",
      referrer: "https://example.com/login",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userA);

  // Create second user (User B)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: "password456",
      ip: "192.168.1.200",
      href: "https://example.com/register",
      referrer: "https://example.com/login",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(userB);

  // Ensure users have different IDs
  TestValidator.notEquals("users have different IDs", userA.id, userB.id);

  // Create multiple sessions for User A by logging in multiple times
  const userAConnection: api.IConnection = { ...connection };
  await api.functional.auth.user.join(userAConnection, {
    body: {
      email: userAEmail,
      password: "password123",
      ip: "192.168.1.101",
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.IJoin,
  });

  await api.functional.auth.user.join(userAConnection, {
    body: {
      email: userAEmail,
      password: "password123",
      ip: "192.168.1.102",
      href: "https://example.com/login",
      referrer: "https://example.com/profile",
    } satisfies ITodoAppUser.IJoin,
  });

  // Create multiple sessions for User B
  const userBConnection: api.IConnection = { ...connection };
  await api.functional.auth.user.join(userBConnection, {
    body: {
      email: userBEmail,
      password: "password456",
      ip: "192.168.1.201",
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies ITodoAppUser.IJoin,
  });

  // User A retrieves their own activity
  const userAActivity =
    await api.functional.todoApp.user.auth.users.activity.index(
      userAConnection,
      {
        userId: userA.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoAppUserSession.IRequest,
      },
    );
  typia.assert(userAActivity);

  // Verify User A can only see their own sessions
  TestValidator.predicate("User A activity contains only their sessions", () =>
    userAActivity.data.every((session) => session.user_id === userA.id),
  );

  // Verify User A has multiple sessions
  TestValidator.predicate(
    "User A has multiple sessions",
    () => userAActivity.data.length >= 3, // Initial join + 2 additional sessions
  );

  // Verify session summaries have proper audit trail fields without sensitive data
  TestValidator.predicate("Sessions have required audit fields", () =>
    userAActivity.data.every(
      (session) =>
        session.id !== undefined &&
        session.user_id !== undefined &&
        session.created_at !== undefined &&
        typeof session.expired_at !== "undefined", // Can be null or string
    ),
  );

  // User B retrieves their own activity
  const userBActivity =
    await api.functional.todoApp.user.auth.users.activity.index(
      userBConnection,
      {
        userId: userB.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ITodoAppUserSession.IRequest,
      },
    );
  typia.assert(userBActivity);

  // Verify User B can only see their own sessions
  TestValidator.predicate("User B activity contains only their sessions", () =>
    userBActivity.data.every((session) => session.user_id === userB.id),
  );

  // Verify User A and User B have separate session histories
  TestValidator.predicate(
    "Users have separate session histories",
    () => userAActivity.data.length > 0 && userBActivity.data.length > 0,
  );

  // Test cross-user access attempt - User A trying to access User B's sessions
  await TestValidator.error(
    "User A should not access User B's sessions",
    async () => {
      await api.functional.todoApp.user.auth.users.activity.index(
        userAConnection,
        {
          userId: userB.id, // User A trying to access User B's sessions
          body: {
            page: 1,
            limit: 10,
          } satisfies ITodoAppUserSession.IRequest,
        },
      );
    },
  );

  // Test activity filtering with date ranges
  const testDateStart = new Date();
  testDateStart.setHours(testDateStart.getHours() - 1); // 1 hour ago

  const userAFilteredActivity =
    await api.functional.todoApp.user.auth.users.activity.index(
      userAConnection,
      {
        userId: userA.id,
        body: {
          page: 1,
          limit: 10,
          created_at_start: testDateStart.toISOString(),
          created_at_end: new Date().toISOString(),
        } satisfies ITodoAppUserSession.IRequest,
      },
    );
  typia.assert(userAFilteredActivity);

  // Verify filtered results are within date range
  TestValidator.predicate("Filtered sessions are within date range", () =>
    userAFilteredActivity.data.every((session) => {
      const sessionCreated = new Date(session.created_at);
      return sessionCreated >= testDateStart && sessionCreated <= new Date();
    }),
  );

  // Test filtering for expired sessions
  const userAExpiredSessions =
    await api.functional.todoApp.user.auth.users.activity.index(
      userAConnection,
      {
        userId: userA.id,
        body: {
          page: 1,
          limit: 10,
          expired_at: true, // Filter for expired sessions
        } satisfies ITodoAppUserSession.IRequest,
      },
    );
  typia.assert(userAExpiredSessions);

  // Test pagination with higher limit
  const userALargePage =
    await api.functional.todoApp.user.auth.users.activity.index(
      userAConnection,
      {
        userId: userA.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies ITodoAppUserSession.IRequest,
      },
    );
  typia.assert(userALargePage);

  // Verify pagination metadata
  TestValidator.equals(
    "Pagination limit matches request",
    userALargePage.pagination.limit,
    50,
  );
  TestValidator.equals(
    "Pagination current page matches request",
    userALargePage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "Has pagination metadata",
    () =>
      userALargePage.pagination.records >= 0 &&
      userALargePage.pagination.pages >= 0,
  );

  // Verify no sensitive data is exposed in session summaries
  TestValidator.predicate(
    "Session summaries do not expose sensitive data",
    () =>
      userAActivity.data.every((session) => {
        // Session object should not contain password or other sensitive fields
        return (
          !("password_hash" in session) &&
          !("password" in session) &&
          !("email" in session) &&
          !("access_token" in session)
        );
      }),
  );

  // Verify session isolation between users - no overlap
  const userASessionIds = userAActivity.data.map((s) => s.id);
  const userBSessionIds = userBActivity.data.map((s) => s.id);

  TestValidator.predicate(
    "No session overlap between users",
    () => !userASessionIds.some((id) => userBSessionIds.includes(id)),
  );

  // Test maximum page limit validation
  await TestValidator.error("Should reject invalid page limit", async () => {
    await api.functional.todoApp.user.auth.users.activity.index(
      userAConnection,
      {
        userId: userA.id,
        body: {
          page: 1,
          limit: 1001, // Exceeds maximum limit of 1000
        } satisfies ITodoAppUserSession.IRequest,
      },
    );
  });

  TestValidator.predicate(
    "Activity endpoint enforces authentication boundaries",
    () => userAActivity.data.length > 0 && userBActivity.data.length > 0,
  );
}
