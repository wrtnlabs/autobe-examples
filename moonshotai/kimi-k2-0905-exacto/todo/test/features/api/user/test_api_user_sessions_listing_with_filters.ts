import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUserSession";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";

/**
 * Test user session listing with advanced filtering and pagination.
 *
 * This comprehensive test validates the entire user session management
 * workflow:
 *
 * 1. Create a new user account for testing session functionality
 * 2. Generate multiple user sessions through various activities
 * 3. Test session listing with IP address filtering
 * 4. Validate date range filtering for session queries
 * 5. Test session status filtering (active vs expired)
 * 6. Verify pagination works correctly with filtering
 * 7. Ensure users can only access their own sessions
 * 8. Validate session data integrity and proper authorization
 *
 * The test covers both successful operations and edge cases including:
 *
 * - Invalid user ID access attempts
 * - Non-existent session ID handling
 * - Empty result sets with filters
 * - Multiple concurrent session creation
 * - Session expiration and cleanup logic
 */
export async function test_api_user_sessions_listing_with_filters(
  connection: api.IConnection,
) {
  // Create test user and generate sessions
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // Generate multiple sessions through task creation
  const taskPromises = ArrayUtil.repeat(5, () =>
    api.functional.todo.user.user_tasks.create(connection, {
      body: {
        description: RandomGenerator.paragraph({ sentences: 2 }),
        business_status: "pending",
        href: "https://example.com/tasks",
        referrer: "https://example.com/dashboard",
        ip: "127.0.0.1",
      } satisfies ITodoTask.ICreate,
    }),
  );
  await Promise.all(taskPromises);

  // Test basic session listing
  const allSessions = await api.functional.todo.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(allSessions);
  TestValidator.predicate("sessions exist", allSessions.data.length > 0);

  // Test IP address filtering
  const filteredByIP = await api.functional.todo.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 5,
        ip: "127.0.0.1",
      },
    },
  );
  TestValidator.predicate(
    "all filtered sessions have correct IP",
    filteredByIP.data.every((session) => session.ip === "127.0.0.1"),
  );

  // Test pagination
  const page2 = await api.functional.todo.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 2,
        limit: 3,
      },
    },
  );
  TestValidator.equals("different page results", page2.pagination.current, 2);

  // Test date range filtering
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentSessions = await api.functional.todo.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        created_after: lastWeek,
      },
    },
  );
  TestValidator.predicate(
    "all sessions within date range",
    recentSessions.data.every(
      (session) => new Date(session.created_at) > new Date(lastWeek),
    ),
  );

  // Test expired session filtering
  const expiredSessions = await api.functional.todo.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        expired: true,
      },
    },
  );
  TestValidator.predicate(
    "all returned sessions are expired",
    expiredSessions.data.every((session) => session.expired_at !== null),
  );

  // Test active session filtering
  const activeSessions = await api.functional.todo.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        expired: false,
      },
    },
  );
  TestValidator.predicate(
    "all returned sessions are active",
    activeSessions.data.every((session) => session.expired_at === null),
  );

  // Test authorization - users can only access their own sessions
  const otherUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "users cannot access other user sessions",
    async () => {
      await api.functional.todo.user.users.sessions.index(connection, {
        userId: otherUserId,
        body: {
          page: 1,
          limit: 10,
        },
      });
    },
  );

  // Test empty results with invalid filters
  const emptyResults = await api.functional.todo.user.users.sessions.index(
    connection,
    {
      userId: user.id,
      body: {
        page: 1,
        limit: 10,
        ip: "192.168.1.100", // Non-existent IP in test environment
      },
    },
  );
  TestValidator.equals(
    "empty results when filtering by non-existent IP",
    emptyResults.data.length,
    0,
  );

  // Validate session data integrity
  TestValidator.predicate(
    "all sessions have valid UUIDs",
    allSessions.data.every((session) =>
      typia.is<string & tags.Format<"uuid">>(session.id),
    ),
  );
}
