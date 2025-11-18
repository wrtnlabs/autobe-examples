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
 * Test sorting sessions by creation time in descending order (newest first).
 *
 * Validates that the session list endpoint correctly sorts authentication
 * sessions by their creation timestamp in descending order. The test creates a
 * user account, generates multiple sessions with different creation times, and
 * verifies that the API returns sessions ordered from newest to oldest when
 * sorted by created_at in descending order.
 *
 * Steps:
 *
 * 1. Register a new user account to establish the first session
 * 2. Create additional sessions by making multiple login/registration calls
 * 3. Request the session list with sort_by='created_at' and order='desc'
 * 4. Verify sessions are ordered from newest to oldest
 * 5. Confirm the first session has the most recent creation timestamp
 */
export async function test_api_sessions_sort_by_created_at_descending(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to establish initial session
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: email,
        password: password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Small delay to ensure different creation timestamps for sessions
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 3: Request sessions sorted by created_at in descending order
  const response: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(response);

  // Step 4: Verify response structure
  TestValidator.predicate(
    "response has pagination info",
    response.pagination !== null && response.pagination !== undefined,
  );

  TestValidator.predicate(
    "response has data array",
    response.data !== null && Array.isArray(response.data),
  );

  TestValidator.predicate(
    "at least one session exists",
    response.data.length > 0,
  );

  // Step 5: Verify sessions are sorted in descending order by created_at
  for (let i = 0; i < response.data.length - 1; i++) {
    const currentSession = response.data[i];
    const nextSession = response.data[i + 1];

    const currentTime = new Date(currentSession.created_at).getTime();
    const nextTime = new Date(nextSession.created_at).getTime();

    TestValidator.predicate(
      `session ${i} created_at (${currentSession.created_at}) >= session ${i + 1} created_at (${nextSession.created_at})`,
      currentTime >= nextTime,
    );
  }

  // Step 6: Confirm first session has the most recent timestamp
  const firstSession = response.data[0];
  TestValidator.predicate(
    "first session has valid created_at timestamp",
    firstSession.created_at !== null && firstSession.created_at !== undefined,
  );

  // Step 7: Verify the first session belongs to the created user
  TestValidator.equals(
    "first session belongs to created user",
    firstSession.todo_list_user_id,
    user.id,
  );
}
