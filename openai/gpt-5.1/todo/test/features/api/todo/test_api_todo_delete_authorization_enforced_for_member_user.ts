import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_todo_delete_authorization_enforced_for_member_user(
  connection: api.IConnection,
) {
  // 1. Register a new member user (this also sets Authorization header)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const authorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a todo as the authenticated member user
  const createBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoAppTodo.ICreate;

  const created: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 3. Build an unauthenticated connection by clearing headers
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to delete the todo without Authorization
  await TestValidator.httpError(
    "unauthenticated member user cannot delete todo",
    [401, 403],
    async () => {
      await api.functional.todoApp.memberUser.todos.erase(unauthenticated, {
        todoId: created.id,
      });
    },
  );

  // 5. Delete the todo with the authenticated connection
  const erased: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.erase(connection, {
      todoId: created.id,
    });
  typia.assert(erased);

  // 6. Business assertion: erased id should match created id
  TestValidator.equals(
    "authorized deletion returns the same todo id",
    erased.id,
    created.id,
  );
}
