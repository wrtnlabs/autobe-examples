import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListSession";
import type { ITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSession";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test filtering sessions to show only active sessions (where expired_at is
 * null).
 *
 * This test validates the session filtering functionality by:
 *
 * 1. Creating a new user account which establishes an initial active session
 * 2. Requesting the sessions list with status='active' filter
 * 3. Verifying all returned sessions have null/omitted expired_at field
 * 4. Validating pagination metadata shows correct count of active sessions
 *
 * Active sessions are those where expired_at is null, indicating the user is
 * currently logged in from that device. This is essential for device management
 * and security monitoring.
 */
export async function test_api_sessions_filter_by_active_status(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to create an initial active session
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: "192.168.1.1",
        user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  TestValidator.predicate(
    "user should be created",
    user.id !== null && user.id !== undefined,
  );

  // Step 2: Request sessions with active status filter
  const activeSessions: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "active",
      } satisfies ITodoListSession.IRequest,
    });

  typia.assert(activeSessions);

  // Step 3: Verify all returned sessions have null/omitted expired_at field
  TestValidator.predicate(
    "active sessions should exist",
    activeSessions.data.length > 0,
  );

  activeSessions.data.forEach((session) => {
    TestValidator.predicate(
      "session expired_at should be null or undefined",
      session.expired_at === null || session.expired_at === undefined,
    );
  });

  // Step 4: Verify pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    activeSessions.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination records should match or exceed returned data",
    activeSessions.pagination.records >= activeSessions.data.length,
  );

  TestValidator.predicate(
    "pagination limit should be 10",
    activeSessions.pagination.limit === 10,
  );

  // Step 5: Verify response structure validity
  activeSessions.data.forEach((session) => {
    TestValidator.predicate(
      "session should have valid id",
      session.id !== null && session.id !== undefined,
    );

    TestValidator.predicate(
      "session should have valid user id",
      session.todo_list_user_id !== null &&
        session.todo_list_user_id !== undefined,
    );

    TestValidator.predicate(
      "session should have ip_address",
      session.ip_address !== null && session.ip_address !== undefined,
    );

    TestValidator.predicate(
      "session should have user_agent",
      session.user_agent !== null && session.user_agent !== undefined,
    );

    TestValidator.predicate(
      "session should have created_at timestamp",
      session.created_at !== null && session.created_at !== undefined,
    );

    TestValidator.predicate(
      "session should have last_activity_at timestamp",
      session.last_activity_at !== null &&
        session.last_activity_at !== undefined,
    );

    TestValidator.predicate(
      "session should have absolute_timeout_at timestamp",
      session.absolute_timeout_at !== null &&
        session.absolute_timeout_at !== undefined,
    );
  });

  // Step 6: Verify the registered user's session is in the active sessions list
  const userSessionFound = activeSessions.data.some(
    (session) => session.todo_list_user_id === user.id,
  );

  TestValidator.predicate(
    "newly created user should have active session in results",
    userSessionFound,
  );
}
