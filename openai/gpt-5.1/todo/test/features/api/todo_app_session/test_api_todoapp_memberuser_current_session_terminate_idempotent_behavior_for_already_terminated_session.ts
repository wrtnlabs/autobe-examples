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

export async function test_api_todoapp_memberuser_current_session_terminate_idempotent_behavior_for_already_terminated_session(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) to establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todoapp.example.com/signup",
    referrer: "https://todoapp.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const authorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(authorized);

  // 2. List current sessions with activeOnly=true to obtain an active sessionId
  const listRequestBody = {
    page: 0 satisfies number & tags.Type<"int32">,
    limit: 10 satisfies number & tags.Type<"int32">,
    ip: null,
    createdFrom: null,
    createdTo: null,
    expiredFrom: null,
    expiredTo: null,
    activeOnly: true,
  } satisfies ITodoAppSession.IRequest;

  const pageResult: IPageITodoAppSession.ISummary =
    await api.functional.todoApp.memberUser.actors.current.sessions.index(
      connection,
      {
        body: listRequestBody,
      },
    );
  typia.assert<IPageITodoAppSession.ISummary>(pageResult);

  // Ensure we have at least one active session
  TestValidator.predicate(
    "there should be at least one active session after join",
    pageResult.data.length > 0,
  );

  const targetSession: ITodoAppSession.ISummary = pageResult.data[0];
  typia.assert<ITodoAppSession.ISummary>(targetSession);

  const sessionId: string & tags.Format<"uuid"> = targetSession.id;

  // 3. First DELETE: terminate the selected session
  await api.functional.todoApp.memberUser.actors.current.sessions.erase(
    connection,
    {
      sessionId,
    },
  );

  // 4. Second DELETE: call again with the same sessionId to verify idempotent/safe behavior
  await api.functional.todoApp.memberUser.actors.current.sessions.erase(
    connection,
    {
      sessionId,
    },
  );

  // If we reach here without error, the API treated repeated deletes as safe.

  // 5. List sessions again with activeOnly=true to confirm the session remains inactive
  const listAfterDeleteBody = {
    page: 0 satisfies number & tags.Type<"int32">,
    limit: 10 satisfies number & tags.Type<"int32">,
    ip: null,
    createdFrom: null,
    createdTo: null,
    expiredFrom: null,
    expiredTo: null,
    activeOnly: true,
  } satisfies ITodoAppSession.IRequest;

  const pageAfterDelete: IPageITodoAppSession.ISummary =
    await api.functional.todoApp.memberUser.actors.current.sessions.index(
      connection,
      {
        body: listAfterDeleteBody,
      },
    );
  typia.assert<IPageITodoAppSession.ISummary>(pageAfterDelete);

  const stillActive = pageAfterDelete.data.some(
    (session) => session.id === sessionId,
  );

  TestValidator.predicate(
    "terminated session must not appear in active-only session listing after repeated deletes",
    !stillActive,
  );
}
