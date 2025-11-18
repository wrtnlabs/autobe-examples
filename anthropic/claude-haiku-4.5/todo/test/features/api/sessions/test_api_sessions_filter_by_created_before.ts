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
 * Test filtering sessions by created_before timestamp parameter.
 *
 * This test validates that the session search API correctly filters sessions
 * based on the created_before parameter. Sessions with created_at timestamp on
 * or before the specified timestamp should be included in results, while
 * sessions created after the timestamp should be excluded.
 *
 * The test workflow:
 *
 * 1. Register a new user which automatically creates an initial session
 * 2. Record the session creation timestamp
 * 3. Query sessions with created_before set to a future time (should include the
 *    session)
 * 4. Validate the returned session has created_at <= created_before
 * 5. Query sessions with created_before set to a past time (before registration)
 * 6. Validate no sessions are returned when filtered before creation time
 */
export async function test_api_sessions_filter_by_created_before(
  connection: api.IConnection,
) {
  // Step 1: Register user and create initial session
  const email = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: email,
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Record the current time (approximately when session was created)
  const sessionCreatedTime = new Date();
  const futureTimestamp = new Date(
    sessionCreatedTime.getTime() + 60000,
  ).toISOString(); // 1 minute in future
  const pastTimestamp = new Date(
    sessionCreatedTime.getTime() - 60000,
  ).toISOString(); // 1 minute in past

  // Step 2: Query sessions with created_before set to future timestamp
  // This should return the session that was just created
  const futureFilterResult: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 10,
        created_before: futureTimestamp,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(futureFilterResult);

  // Validate that at least one session is returned
  TestValidator.predicate(
    "future timestamp filter should return sessions",
    futureFilterResult.data.length > 0,
  );

  // Validate that all returned sessions were created before or at the specified time
  for (const session of futureFilterResult.data) {
    const sessionCreatedDate = new Date(session.created_at).getTime();
    const filterDate = new Date(futureTimestamp).getTime();
    TestValidator.predicate(
      "session created_at should be before or equal to filter timestamp",
      sessionCreatedDate <= filterDate,
    );
  }

  // Step 3: Query sessions with created_before set to past timestamp
  // This should return no sessions since they were created after this time
  const pastFilterResult: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 10,
        created_before: pastTimestamp,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(pastFilterResult);

  // Validate that no sessions are returned (since all sessions were created after the past timestamp)
  TestValidator.equals(
    "past timestamp filter should return no sessions",
    pastFilterResult.data.length,
    0,
  );

  // Verify pagination info is correct
  TestValidator.equals(
    "pagination records should match data length for past filter",
    pastFilterResult.pagination.records,
    0,
  );
}
