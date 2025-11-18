import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSession";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSession";

/**
 * Filter current member user's sessions by created_at time range.
 *
 * Business flow:
 *
 * 1. Register a new member user via POST /auth/memberUser/join, which also
 *    establishes an authenticated context and initial session.
 * 2. Capture an approximate current timestamp T0 from the test runner after
 *    authentication is established.
 * 3. Query PATCH /todoApp/memberUser/actors/current/sessions with a
 *    createdFrom/createdTo window centered around T0 and assert that the
 *    current session is included and all records' created_at lie within the
 *    window.
 * 4. Query again with a past non-overlapping window and verify the current session
 *    is excluded (no sessions are returned), confirming that the created_at
 *    filters are effective.
 */
export async function test_api_todoapp_memberuser_current_sessions_filter_by_created_at_range(
  connection: api.IConnection,
) {
  // 1. Register member user and establish session
  const joinBody = typia.random<ITodoAppMemberUserJoin.ICreate>();
  const member: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(member);

  // 2. Capture current timestamp T0 after authentication context is valid
  const now: Date = new Date();

  // Define +/- 60 seconds buffer around now
  const bufferMs: number = 60 * 1000;
  const fromDate: Date = new Date(now.getTime() - bufferMs);
  const toDate: Date = new Date(now.getTime() + bufferMs);
  const createdFrom: string = fromDate.toISOString();
  const createdTo: string = toDate.toISOString();

  // 3. First query: window containing the current session
  const firstRequestBody = {
    page: 0,
    limit: 10,
    ip: null,
    createdFrom,
    createdTo,
    expiredFrom: null,
    expiredTo: null,
    activeOnly: null,
  } satisfies ITodoAppSession.IRequest;

  const firstPage: IPageITodoAppSession.ISummary =
    await api.functional.todoApp.memberUser.actors.current.sessions.index(
      connection,
      {
        body: firstRequestBody,
      },
    );
  typia.assert<IPageITodoAppSession.ISummary>(firstPage);

  // Validate pagination echoes request
  TestValidator.equals(
    "pagination.current should be 0",
    firstPage.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination.limit should be 10",
    firstPage.pagination.limit,
    10,
  );

  // Ensure at least one session exists in the target window
  TestValidator.predicate(
    "first query should return at least one session",
    firstPage.data.length > 0,
  );

  // Validate each session summary
  for (const session of firstPage.data) {
    // created_at is within [createdFrom, createdTo]
    const createdAtTime: number = new Date(session.created_at).getTime();
    const fromTime: number = new Date(createdFrom).getTime();
    const toTime: number = new Date(createdTo).getTime();

    TestValidator.predicate(
      "session.created_at must be within requested time window",
      createdAtTime >= fromTime && createdAtTime <= toTime,
    );

    // All sessions must belong to the authenticated member
    TestValidator.equals(
      "session.actor_id must match authenticated member id",
      session.actor_id,
      member.id,
    );
  }

  // 4. Second query: non-overlapping past window
  const pastFromDate: Date = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours ago
  const pastToDate: Date = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago
  const pastCreatedFrom: string = pastFromDate.toISOString();
  const pastCreatedTo: string = pastToDate.toISOString();

  const secondRequestBody = {
    page: 0,
    limit: 10,
    ip: null,
    createdFrom: pastCreatedFrom,
    createdTo: pastCreatedTo,
    expiredFrom: null,
    expiredTo: null,
    activeOnly: null,
  } satisfies ITodoAppSession.IRequest;

  const secondPage: IPageITodoAppSession.ISummary =
    await api.functional.todoApp.memberUser.actors.current.sessions.index(
      connection,
      {
        body: secondRequestBody,
      },
    );
  typia.assert<IPageITodoAppSession.ISummary>(secondPage);

  // In a non-overlapping past window, there should be no sessions for the
  // newly created account.
  TestValidator.equals(
    "second query for past window should return no sessions",
    secondPage.data.length,
    0,
  );
}
