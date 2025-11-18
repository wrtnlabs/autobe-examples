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
 * Test filtering sessions with last activity after a specific timestamp.
 *
 * This test validates that the session filtering API correctly filters sessions
 * based on their last activity timestamp. It ensures that when a user queries
 * sessions with a last_activity_after parameter, only sessions that have been
 * active at or after the specified timestamp are returned.
 *
 * The test performs the following steps:
 *
 * 1. Register a new user (creates initial session with login activity)
 * 2. Record the initial session creation time
 * 3. Wait briefly to create a time gap
 * 4. Perform another API call to update last_activity_at on the session
 * 5. Query sessions with last_activity_after set to a time before the activities
 * 6. Verify all sessions are returned (activity is after the filter time)
 * 7. Query sessions with last_activity_after set to current time
 * 8. Verify sessions with recent activity are properly filtered
 * 9. Validate pagination works correctly with the filter
 * 10. Test with very recent timestamp to ensure no false positives
 */
export async function test_api_sessions_filter_by_last_activity_after(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to create an initial session
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Record the initial time for filtering comparisons
  const timeBeforeActivity = new Date();

  // Step 3: Small delay to ensure time progression
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 4: Perform another API call to update session's last_activity_at
  const sessionsBefore: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(sessionsBefore);
  TestValidator.predicate(
    "initial sessions query should return at least one session",
    sessionsBefore.data.length >= 1,
  );

  // Step 5: Query sessions with last_activity_after set to before user registration
  const filterTimeBeforeActivity = new Date(
    timeBeforeActivity.getTime() - 5000,
  ).toISOString();
  const sessionsAfterOldTime: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 10,
        last_activity_after: filterTimeBeforeActivity as string &
          tags.Format<"date-time">,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(sessionsAfterOldTime);

  // Step 6: Verify all sessions with activity after old timestamp are returned
  TestValidator.equals(
    "sessions with activity after old timestamp should include the newly created session",
    sessionsAfterOldTime.data.length,
    sessionsBefore.data.length,
  );

  // Verify all returned sessions have last_activity_at >= filter time
  for (const session of sessionsAfterOldTime.data) {
    TestValidator.predicate(
      `session ${session.id} activity time should be >= filter time`,
      new Date(session.last_activity_at).getTime() >=
        new Date(filterTimeBeforeActivity).getTime(),
    );
  }

  // Step 7: Query sessions with last_activity_after set to far future timestamp
  const futureTime = new Date(Date.now() + 3600000).toISOString();
  const sessionsAfterFutureTime: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 10,
        last_activity_after: futureTime as string & tags.Format<"date-time">,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(sessionsAfterFutureTime);

  // Step 8: Verify no sessions are returned when filtering with future timestamp
  TestValidator.equals(
    "sessions after future timestamp should be empty",
    sessionsAfterFutureTime.data.length,
    0,
  );

  // Step 9: Test with very recent timestamp
  const recentPastTime = new Date(Date.now() - 1000).toISOString();
  const sessionsAfterRecentTime: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 10,
        last_activity_after: recentPastTime as string &
          tags.Format<"date-time">,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(sessionsAfterRecentTime);

  // Sessions created within last second should be included
  TestValidator.predicate(
    "should have sessions with recent activity",
    sessionsAfterRecentTime.data.length >= 1,
  );

  // Step 10: Verify all filtered sessions meet the criteria
  for (const session of sessionsAfterRecentTime.data) {
    TestValidator.predicate(
      `session activity must be >= recent filter time`,
      new Date(session.last_activity_at).getTime() >=
        new Date(recentPastTime).getTime(),
    );

    TestValidator.predicate(
      `session should not be expired when filtering by activity`,
      session.expired_at === null || session.expired_at === undefined,
    );
  }

  // Step 11: Test pagination with filter
  const paginatedSessions: IPageITodoListSession.ISummary =
    await api.functional.todoList.user.auth.user.sessions.index(connection, {
      body: {
        page: 1,
        limit: 5,
        last_activity_after: filterTimeBeforeActivity as string &
          tags.Format<"date-time">,
      } satisfies ITodoListSession.IRequest,
    });
  typia.assert(paginatedSessions);

  TestValidator.predicate(
    "pagination info should be valid",
    paginatedSessions.pagination.limit === 5,
  );

  TestValidator.predicate(
    "current page should be 1",
    paginatedSessions.pagination.current === 1,
  );
}
