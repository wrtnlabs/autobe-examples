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
 * Terminate a current member user's session and verify active vs. historical
 * listings.
 *
 * Business flow (adapted to available APIs):
 *
 * 1. Register a new member user via POST /auth/memberUser/join. This both creates
 *    the member account and establishes at least one authentication session for
 *    that actor.
 * 2. Using the authenticated connection established by join, call PATCH
 *    /todoApp/memberUser/actors/current/sessions with activeOnly=true, page=0,
 *    and a sufficiently large limit to retrieve all active sessions belonging
 *    to the current member user.
 * 3. Select one session summary from the returned list (typically the only one in
 *    a fresh environment) and remember its id.
 * 4. Invoke DELETE /todoApp/memberUser/actors/current/sessions/{sessionId} for
 *    that id to terminate the selected session.
 * 5. Call the PATCH listing endpoint again with activeOnly=true and verify that
 *    the terminated session id is no longer present in the active session
 *    list.
 * 6. Call the listing endpoint once more with activeOnly set to null so that both
 *    active and historical sessions may be returned. If the terminated session
 *    still appears, assert that its expired_at field is non-null, indicating it
 *    is no longer active but retained historically.
 *
 * This scenario validates that the session termination endpoint successfully
 * marks a session as inactive and that the session listing endpoint properly
 * reflects the difference between active-only and full (including historical)
 * views, within the constraints of the available APIs.
 */
export async function test_api_todoapp_memberuser_current_session_terminate_all_other_devices_iteratively(
  connection: api.IConnection,
) {
  // 1. Register a new member user, establishing an authenticated session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo.example.com/signup",
    referrer: "https://todo.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const authorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(authorized);

  // 2. Helper to list sessions for the current actor with a given activeOnly flag.
  const listSessions = async (
    activeOnly: boolean | null,
  ): Promise<IPageITodoAppSession.ISummary> => {
    const requestBody = {
      page: 0 as number & tags.Type<"int32">,
      limit: 50 as number & tags.Type<"int32">,
      ip: null,
      createdFrom: null,
      createdTo: null,
      expiredFrom: null,
      expiredTo: null,
      activeOnly,
    } satisfies ITodoAppSession.IRequest;

    const pageResult: IPageITodoAppSession.ISummary =
      await api.functional.todoApp.memberUser.actors.current.sessions.index(
        connection,
        {
          body: requestBody,
        },
      );
    typia.assert<IPageITodoAppSession.ISummary>(pageResult);
    return pageResult;
  };

  // 3. List all active sessions; expect at least one due to the join call.
  const activePageBefore: IPageITodoAppSession.ISummary =
    await listSessions(true);

  TestValidator.equals(
    "initial active sessions page index should be 0",
    activePageBefore.pagination.current,
    0,
  );

  TestValidator.predicate(
    "there should be at least one active session after join",
    activePageBefore.data.length > 0,
  );

  const activeSessionsBefore: ITodoAppSession.ISummary[] =
    activePageBefore.data;

  // Select one session to terminate (for a fresh user, typically the only one).
  const targetSession: ITodoAppSession.ISummary = activeSessionsBefore[0];
  typia.assert<ITodoAppSession.ISummary>(targetSession);

  const targetSessionId: string & tags.Format<"uuid"> = targetSession.id;

  // 4. Terminate the selected session.
  await api.functional.todoApp.memberUser.actors.current.sessions.erase(
    connection,
    {
      sessionId: targetSessionId,
    },
  );

  // 5. Re-list active sessions and verify the terminated session is no longer active.
  const activePageAfter: IPageITodoAppSession.ISummary =
    await listSessions(true);

  TestValidator.equals(
    "active sessions page index after termination should be 0",
    activePageAfter.pagination.current,
    0,
  );

  const activeSessionsAfter: ITodoAppSession.ISummary[] = activePageAfter.data;

  const activeIdsAfter: string[] = activeSessionsAfter.map((s) => s.id);

  TestValidator.predicate(
    "terminated session should not appear in active-only listing",
    !activeIdsAfter.includes(targetSessionId),
  );

  // 6. List all sessions (active + historical) and, if the terminated session
  // is present, ensure it is marked as expired.
  const allPageAfter: IPageITodoAppSession.ISummary = await listSessions(null);
  const allSessionsAfter: ITodoAppSession.ISummary[] = allPageAfter.data;

  const maybeHistorical = allSessionsAfter.find(
    (s) => s.id === targetSessionId,
  );

  if (maybeHistorical !== undefined) {
    typia.assert<ITodoAppSession.ISummary>(maybeHistorical);
    TestValidator.predicate(
      "historical terminated session should have expired_at set",
      maybeHistorical.expired_at !== null &&
        maybeHistorical.expired_at !== undefined,
    );
  }
}
