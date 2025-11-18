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
 * Test sorting sessions by last activity timestamp.
 *
 * This test validates that the sessions list API correctly sorts sessions by
 * their last_activity_at timestamp. The test creates a user account (which
 * generates an initial session), then retrieves the sessions list with
 * sort_by='last_activity_at' parameter and verifies that sessions are properly
 * ordered according to the specified sort direction.
 *
 * Steps:
 *
 * 1. Register a new user to create an initial session
 * 2. Request sessions list sorted by last_activity_at in ascending order
 * 3. Verify sessions are ordered by last_activity_at (oldest first)
 * 4. Request sessions list sorted by last_activity_at in descending order
 * 5. Verify sessions are ordered by last_activity_at (newest first)
 */
export async function test_api_sessions_sort_by_last_activity_at(
  connection: api.IConnection,
) {
  // Step 1: Register a new user (creates initial session)
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Request sessions sorted by last_activity_at in ascending order
  const sessionsAsc =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "last_activity_at",
        order: "asc",
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(sessionsAsc);

  // Step 3: Verify ascending order
  TestValidator.predicate(
    "sessions should have at least one entry",
    sessionsAsc.data.length > 0,
  );

  for (let i = 1; i < sessionsAsc.data.length; i++) {
    const prevSession = sessionsAsc.data[i - 1];
    const currentSession = sessionsAsc.data[i];
    TestValidator.predicate(
      `session at index ${i} last_activity_at should be >= previous session's last_activity_at in ascending order`,
      new Date(prevSession.last_activity_at) <=
        new Date(currentSession.last_activity_at),
    );
  }

  // Step 4: Request sessions sorted by last_activity_at in descending order
  const sessionsDesc =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "last_activity_at",
        order: "desc",
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(sessionsDesc);

  // Step 5: Verify descending order
  TestValidator.predicate(
    "sessions should have at least one entry",
    sessionsDesc.data.length > 0,
  );

  for (let i = 1; i < sessionsDesc.data.length; i++) {
    const prevSession = sessionsDesc.data[i - 1];
    const currentSession = sessionsDesc.data[i];
    TestValidator.predicate(
      `session at index ${i} last_activity_at should be <= previous session's last_activity_at in descending order`,
      new Date(prevSession.last_activity_at) >=
        new Date(currentSession.last_activity_at),
    );
  }

  // Verify that both requests return sessions in opposite order
  TestValidator.predicate(
    "first session in ascending order should be the last session in descending order",
    sessionsAsc.data[0].id ===
      sessionsDesc.data[sessionsDesc.data.length - 1].id,
  );
}
