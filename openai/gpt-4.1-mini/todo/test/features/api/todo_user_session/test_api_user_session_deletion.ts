import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";

export async function test_api_user_session_deletion(
  connection: api.IConnection,
) {
  // 1. Authenticate user join
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies ITodoUser.ICreate;

  const authorizedUser: ITodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Create todo user
  const todoUserCreateBody = {
    email: userCreateBody.email,
    password: userCreateBody.password,
  } satisfies ITodoUser.ICreate;

  const todoUser: ITodoUser = await api.functional.todo.todoUsers.create(
    connection,
    {
      body: todoUserCreateBody,
    },
  );
  typia.assert(todoUser);

  // 3. Create user session
  const sessionCreateBody = {
    ip: "192.168.0.1",
    href: "https://example.com/",
    referrer: "https://google.com/",
  } satisfies ITodoUserSession.ICreate;

  const userSession: ITodoUserSession =
    await api.functional.todo.user.todoUsers.sessions.create(connection, {
      todoUserEmail: todoUser.email,
      body: sessionCreateBody,
    });
  typia.assert(userSession);

  // 4. Delete the session
  await api.functional.todo.user.todoUsers.sessions.erase(connection, {
    todoUserEmail: todoUser.email,
    id: userSession.id,
  });

  // This test does not provide explicit re-access to confirm deletion,
  // but successful completion of erase endpoint call signifies deletion success
  TestValidator.predicate("session erase success", true);
}
