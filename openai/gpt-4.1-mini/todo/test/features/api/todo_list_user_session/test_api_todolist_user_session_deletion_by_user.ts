import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

export async function test_api_todolist_user_session_deletion_by_user(
  connection: api.IConnection,
) {
  // 1. User registration (join) to obtain authorized user with token
  const userCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;
  const user: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreate,
    });
  typia.assert(user);

  // 2. Create a session for the user
  const sessionCreate = {
    ip: "127.0.0.1",
    href: "https://example.com/todos",
    referrer: "https://example.com/home",
    expired_at: null,
  } satisfies ITodoListUserSession.ICreate;

  const session: ITodoListUserSession =
    await api.functional.todoList.user.todoListUsers.todoListUserSessions.create(
      connection,
      {
        todoListUserId: user.id,
        body: sessionCreate,
      },
    );
  typia.assert(session);

  // 3. Delete the created session
  await api.functional.todoList.user.todoListUsers.todoListUserSessions.erase(
    connection,
    {
      todoListUserId: user.id,
      id: session.id,
    },
  );

  // 4. Attempt to delete a session with a non-existent id, expect error
  const fakeSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should not delete a session with non-existent id",
    async () => {
      await api.functional.todoList.user.todoListUsers.todoListUserSessions.erase(
        connection,
        {
          todoListUserId: user.id,
          id: fakeSessionId,
        },
      );
    },
  );
}
