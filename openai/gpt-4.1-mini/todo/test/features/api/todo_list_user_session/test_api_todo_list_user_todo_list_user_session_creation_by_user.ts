import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

export async function test_api_todo_list_user_todo_list_user_session_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Join operation - user authentication
  const userBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;

  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userBody,
    });

  typia.assert(authorizedUser);

  // 2. Create a new user session
  const sessionBody = {
    href: `https://todo.example.com/session/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://referer.example.com/path/${RandomGenerator.alphaNumeric(5)}`,
    ip: `192.168.${RandomGenerator.alphaNumeric(1)}.${RandomGenerator.alphaNumeric(1)}`,
    expired_at: null,
  } satisfies ITodoListUserSession.ICreate;

  const createdSession: ITodoListUserSession =
    await api.functional.todoList.user.todoListUserSessions.create(connection, {
      body: sessionBody,
    });

  typia.assert(createdSession);

  // 3. Verify that session is linked to authorized user
  TestValidator.equals(
    "session user id matches authorized user",
    createdSession.todo_list_user_id,
    authorizedUser.id,
  );
  TestValidator.predicate(
    "session has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdSession.id,
    ),
  );
  TestValidator.equals(
    "session href matches input",
    createdSession.href,
    sessionBody.href,
  );
  TestValidator.equals(
    "session referrer matches input",
    createdSession.referrer,
    sessionBody.referrer,
  );
  TestValidator.equals(
    "session ip matches input",
    createdSession.ip ?? null,
    sessionBody.ip ?? null,
  );
}
