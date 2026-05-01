import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test date range filtering on the guest sessions list endpoint.
 *
 * Authenticates as a guest to create a session with a known creation timestamp,
 * then calls the sessions list endpoint with various date range filter combinations
 * to verify inclusive upper and lower bound filtering works correctly.
 *
 * 1. Guest joins to create a session, capturing timestamps before and after the join.
 * 2. Queries with both startDate and endDate forming an inclusive range around the
 *    session creation time. Verifies all returned sessions fall within the range and
 *    at least one session is present.
 * 3. Queries with an endDate strictly before the session was created. Verifies no
 *    returned session has a created_at timestamp after the exclusive endDate bound.
 * 4. Queries with only startDate (open-ended future). Verifies all returned sessions
 *    have created_at at or after the startDate bound.
 * 5. Queries with only endDate (open-ended past). Verifies all returned sessions
 *    have created_at at or before the endDate bound.
 */
export async function test_api_session_list_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Capture timestamp before guest join
  const beforeJoin = new Date();
  // 2. Authenticate as guest - creates a session
  const guestConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_guest_join(guestConnection, {});
  typia.assert(authResult);
  // 3. Capture timestamp after join (session created between beforeJoin and afterJoin)
  const afterJoin = new Date();
  // 4. Test inclusive date range: both startDate and endDate encompass the session
  const inclusiveResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        startDate: beforeJoin.toISOString(),
        endDate: afterJoin.toISOString(),
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(inclusiveResult);
  const allInRange = inclusiveResult.data.every((s) => {
    const createdAt = new Date(s.created_at).getTime();
    return (
      createdAt >= beforeJoin.getTime() && createdAt <= afterJoin.getTime()
    );
  });
  TestValidator.predicate(
    "all sessions within inclusive date range",
    allInRange,
  );
  TestValidator.predicate(
    "inclusive range has sessions",
    inclusiveResult.data.length > 0,
  );
  // 5. Test exclusive date range: endDate strictly before the session was created
  const exclusiveEndDate = new Date(beforeJoin.getTime() - 10000);
  const exclusiveResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        endDate: exclusiveEndDate.toISOString(),
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(exclusiveResult);
  const allBeforeExclusiveEnd = exclusiveResult.data.every(
    (s) => new Date(s.created_at).getTime() <= exclusiveEndDate.getTime(),
  );
  TestValidator.predicate(
    "all sessions before exclusive endDate",
    allBeforeExclusiveEnd,
  );
  // 6. Test only startDate - open-ended future (no upper bound)
  const startOnlyResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        startDate: beforeJoin.toISOString(),
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(startOnlyResult);
  const allAfterStart = startOnlyResult.data.every(
    (s) => new Date(s.created_at).getTime() >= beforeJoin.getTime(),
  );
  TestValidator.predicate(
    "all sessions at or after startDate (open-ended future)",
    allAfterStart,
  );
  TestValidator.predicate(
    "startDate-only range has sessions",
    startOnlyResult.data.length > 0,
  );
  // 7. Test only endDate - open-ended past (no lower bound)
  const endOnlyResult = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        endDate: afterJoin.toISOString(),
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(endOnlyResult);
  const allBeforeEnd = endOnlyResult.data.every(
    (s) => new Date(s.created_at).getTime() <= afterJoin.getTime(),
  );
  TestValidator.predicate(
    "all sessions at or before endDate (open-ended past)",
    allBeforeEnd,
  );
  TestValidator.predicate(
    "endDate-only range has sessions",
    endOnlyResult.data.length > 0,
  );
}
