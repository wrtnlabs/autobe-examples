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
 * Test that default sort order is descending when order parameter is omitted.
 *
 * This test validates that the session list endpoint returns sessions ordered
 * by created_at in descending order by default when no order parameter is
 * provided. Users should see their most recent login sessions first without
 * having to explicitly specify order='desc'.
 *
 * Steps:
 *
 * 1. Register a new user account (creates initial session)
 * 2. Request session list without specifying order parameter (test default)
 * 3. Request session list with explicit order='desc' for comparison
 * 4. Verify both requests return sessions in same order
 * 5. Confirm default behavior is descending (most recent first)
 */
export async function test_api_sessions_default_sort_order_descending(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account (automatically creates initial session)
  const email = typia.random<string & tags.Format<"email">>();
  const password = "password12345"; // Min 8 characters for security

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: "192.168.1.1",
        user_agent: "Mozilla/5.0 (Test User Agent)",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Request session list WITHOUT specifying order parameter (test default)
  const sessionsDefault: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "created_at",
        // order is NOT specified - testing default behavior should be descending
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(sessionsDefault);

  // Step 3: Request session list WITH explicit order='desc' for comparison
  const sessionsDescending: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort_by: "created_at",
        order: "desc",
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(sessionsDescending);

  // Step 4: Verify sessions are sorted in descending order (most recent first)
  // Check that default behavior matches explicit descending order
  TestValidator.equals(
    "default sort order should match explicit descending order",
    sessionsDefault.data.map((s) => s.id),
    sessionsDescending.data.map((s) => s.id),
  );

  // Step 5: Verify sessions are actually in descending order by created_at timestamp
  const defaultCreatedAtTimestamps = sessionsDefault.data.map((s) =>
    new Date(s.created_at).getTime(),
  );

  for (let i = 0; i < defaultCreatedAtTimestamps.length - 1; i++) {
    TestValidator.predicate(
      `session at index ${i} created_at should be >= session at index ${i + 1} (descending order)`,
      defaultCreatedAtTimestamps[i] >= defaultCreatedAtTimestamps[i + 1],
    );
  }

  // Verify we have sessions to validate ordering
  TestValidator.predicate(
    "should have at least one session after registration",
    sessionsDefault.data.length > 0,
  );

  // Verify that descending order is the true default (compare timestamps between default and explicit desc)
  const descendingCreatedAtTimestamps = sessionsDescending.data.map((s) =>
    new Date(s.created_at).getTime(),
  );
  TestValidator.equals(
    "default and explicit descending should have identical ordering by timestamp",
    defaultCreatedAtTimestamps,
    descendingCreatedAtTimestamps,
  );
}
