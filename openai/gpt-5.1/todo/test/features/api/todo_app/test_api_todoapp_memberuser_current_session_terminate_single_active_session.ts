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

export async function test_api_todoapp_memberuser_current_session_terminate_single_active_session(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) and establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const authorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(authorized);

  // 2. List active sessions for the current member user
  const activeRequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    activeOnly: true,
  } satisfies ITodoAppSession.IRequest;

  const activePageBefore: IPageITodoAppSession.ISummary =
    await api.functional.todoApp.memberUser.actors.current.sessions.index(
      connection,
      {
        body: activeRequestBody,
      },
    );
  typia.assert<IPageITodoAppSession.ISummary>(activePageBefore);

  const activeSessionsBefore: ITodoAppSession.ISummary[] =
    activePageBefore.data;

  // Ensure we have at least one active session (the join-created session)
  TestValidator.predicate(
    "active session list must contain at least one session after join",
    () => activeSessionsBefore.length > 0,
  );

  const allActiveIdsBefore: string[] = activeSessionsBefore.map((s) => s.id);
  const targetSession: ITodoAppSession.ISummary = activeSessionsBefore[0];
  const sessionIdTarget: string = targetSession.id;

  // 3. Terminate the selected session
  await api.functional.todoApp.memberUser.actors.current.sessions.erase(
    connection,
    {
      sessionId: sessionIdTarget,
    },
  );

  // 4. List active sessions again and ensure target session is gone
  const activePageAfter: IPageITodoAppSession.ISummary =
    await api.functional.todoApp.memberUser.actors.current.sessions.index(
      connection,
      {
        body: activeRequestBody,
      },
    );
  typia.assert<IPageITodoAppSession.ISummary>(activePageAfter);

  const activeSessionsAfter: ITodoAppSession.ISummary[] = activePageAfter.data;
  const allActiveIdsAfter: string[] = activeSessionsAfter.map((s) => s.id);

  // Target session must not be present in active-only list anymore
  TestValidator.predicate(
    "terminated session id must be removed from active sessions",
    () => allActiveIdsAfter.includes(sessionIdTarget) === false,
  );

  // All other previously active sessions (besides the target) must remain
  for (const id of allActiveIdsBefore) {
    if (id === sessionIdTarget) continue;
    TestValidator.predicate(
      "other sessions must remain active after terminating a single session",
      () => allActiveIdsAfter.includes(id),
    );
  }

  // 5. Optionally verify that the terminated session is marked expired when listing all sessions
  const allSessionsRequestBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    activeOnly: null,
  } satisfies ITodoAppSession.IRequest;

  const allSessionsPage: IPageITodoAppSession.ISummary =
    await api.functional.todoApp.memberUser.actors.current.sessions.index(
      connection,
      {
        body: allSessionsRequestBody,
      },
    );
  typia.assert<IPageITodoAppSession.ISummary>(allSessionsPage);

  const terminatedSession = allSessionsPage.data.find(
    (s) => s.id === sessionIdTarget,
  );

  if (terminatedSession !== undefined) {
    TestValidator.predicate(
      "terminated session expired_at should be set when listing all sessions",
      () =>
        terminatedSession.expired_at !== null &&
        terminatedSession.expired_at !== undefined,
    );
  }
}
