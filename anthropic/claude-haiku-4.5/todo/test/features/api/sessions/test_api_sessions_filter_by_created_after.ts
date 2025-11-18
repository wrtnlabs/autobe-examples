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
 * Test filtering sessions created after a specific timestamp.
 *
 * This test validates that the session filtering API correctly filters sessions
 * by their creation date. It verifies that when a created_after timestamp is
 * provided, only sessions with created_at >= created_after are returned.
 *
 * The test workflow:
 *
 * 1. Register a new user (which creates an initial session)
 * 2. Record the session creation timestamp
 * 3. Calculate a filter timestamp between the session creation and current time
 * 4. Query sessions with the created_after filter
 * 5. Verify only sessions created at or after the filter timestamp are returned
 * 6. Confirm sessions before the filter timestamp are excluded
 * 7. Validate pagination and response structure
 */
export async function test_api_sessions_filter_by_created_after(
  connection: api.IConnection,
) {
  // Step 1: Register a new user - this automatically creates a session
  const registrationTime = new Date();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Query all sessions to get the initial session created at registration
  const allSessionsResponse: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(allSessionsResponse);

  TestValidator.predicate(
    "at least one session should exist after registration",
    allSessionsResponse.data.length > 0,
  );

  const firstSession = allSessionsResponse.data[0];
  const sessionCreatedAt = new Date(firstSession.created_at);

  // Step 3: Calculate a filter timestamp between session creation and current time
  const timeDifferenceMs = new Date().getTime() - sessionCreatedAt.getTime();
  const midpointMs = timeDifferenceMs / 2;
  const createdAfterFilter = new Date(
    sessionCreatedAt.getTime() + midpointMs,
  ).toISOString();

  // Step 4: Query sessions with created_after filter
  const filteredResponse: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 100,
        created_after: createdAfterFilter,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(filteredResponse);

  // Step 5: Verify that returned sessions have created_at >= created_after
  for (const session of filteredResponse.data) {
    const sessionTime = new Date(session.created_at);
    const filterTime = new Date(createdAfterFilter);
    TestValidator.predicate(
      `session created_at (${session.created_at}) should be >= created_after filter (${createdAfterFilter})`,
      sessionTime.getTime() >= filterTime.getTime(),
    );
  }

  // Step 6: Verify that the initially created session is excluded (it was created before the filter)
  const filteredSessionIds = filteredResponse.data.map((s) => s.id);
  TestValidator.predicate(
    "first session should be excluded from filtered results",
    !filteredSessionIds.includes(firstSession.id),
  );

  // Step 7: Validate pagination structure
  TestValidator.predicate(
    "pagination current page should be valid",
    filteredResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be valid",
    filteredResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    filteredResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    filteredResponse.pagination.pages >= 0,
  );

  // Step 8: Test edge case - filter with exact session creation timestamp
  const exactFilterResponse: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 100,
        created_after: firstSession.created_at,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(exactFilterResponse);

  // Sessions created exactly at or after the creation timestamp should be included
  for (const session of exactFilterResponse.data) {
    const sessionTime = new Date(session.created_at);
    const filterTime = new Date(firstSession.created_at);
    TestValidator.predicate(
      `session created_at should be >= exact filter timestamp`,
      sessionTime.getTime() >= filterTime.getTime(),
    );
  }

  // The initial session should be included when filtering by its exact creation time
  const exactSessionIds = exactFilterResponse.data.map((s) => s.id);
  TestValidator.predicate(
    "first session should be included when filtering by its exact creation time",
    exactSessionIds.includes(firstSession.id),
  );
}
