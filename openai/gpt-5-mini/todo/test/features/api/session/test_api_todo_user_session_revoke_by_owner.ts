import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodouserSession";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";

export async function test_api_todo_user_session_revoke_by_owner(
  connection: api.IConnection,
) {
  // 1) Create a new todoUser via join (self-signup)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123",
    href: "https://example.com/welcome",
    referrer: "https://example.com/",
  } satisfies ITodoAppTodoUser.ICreate;

  const auth: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, { body: joinBody });
  typia.assert(auth);
  // Ensure token container exists and has an access token
  typia.assert<IAuthorizationToken>(auth.token);
  TestValidator.predicate(
    "join returned a non-empty access token",
    !!auth.token.access,
  );

  const todoUserId: string = auth.id;

  // 2) List sessions for the newly created user to capture an active sessionId
  const pageResult: IPageITodoAppTodouserSession.ISummary =
    await api.functional.todoApp.todoUser.todoUsers.sessions.index(connection, {
      todoUserId,
      body: {
        page: 1,
        pageSize: 10,
        status: "all",
      } satisfies ITodoAppTodouserSession.IRequest,
    });
  typia.assert(pageResult);

  TestValidator.predicate(
    "at least one session exists after join",
    pageResult.data.length > 0,
  );

  const sessionId: string = pageResult.data[0].id;

  // 3) Revoke (hard-delete) the captured session by owner
  await api.functional.todoApp.todoUser.todoUsers.sessions.erase(connection, {
    todoUserId,
    sessionId,
  });

  // 4) Verify deletion: GET should now fail (session not found)
  await TestValidator.error(
    `deleted session (${sessionId}) should not be retrievable`,
    async () => {
      await api.functional.todoApp.todoUser.todoUsers.sessions.at(connection, {
        todoUserId,
        sessionId,
      });
    },
  );

  // 5) Additional check: listing sessions should not include revoked session id
  const pageAfter: IPageITodoAppTodouserSession.ISummary =
    await api.functional.todoApp.todoUser.todoUsers.sessions.index(connection, {
      todoUserId,
      body: {
        page: 1,
        pageSize: 20,
        status: "all",
      } satisfies ITodoAppTodouserSession.IRequest,
    });
  typia.assert(pageAfter);

  TestValidator.predicate(
    `revoked session id (${sessionId}) should not appear in session listing`,
    !pageAfter.data.some((s) => s.id === sessionId),
  );
}
