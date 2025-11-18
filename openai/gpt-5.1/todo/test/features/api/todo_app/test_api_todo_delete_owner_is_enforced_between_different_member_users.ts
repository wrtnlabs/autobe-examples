import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_todo_delete_owner_is_enforced_between_different_member_users(
  connection: api.IConnection,
) {
  // 1. Register User A via /auth/memberUser/join
  const userARequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const userA: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: userARequestBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(userA);

  // 2. Create a todo as User A via /todoApp/memberUser/todos
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITodoAppTodo.ICreate;

  const userATodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert<ITodoAppTodo>(userATodo);

  // Sanity check: created todo is owned by User A
  TestValidator.equals(
    "todo created by User A should be owned by User A",
    userATodo.memberUser.id,
    userA.id,
  );

  // 3. Prepare a fresh unauthenticated connection for User B
  const userBConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Register User B via /auth/memberUser/join using userBConnection
  const userBRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const userB: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(userBConnection, {
      body: userBRequestBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(userB);

  // 5. Cross-user deletion attempt: User B tries to delete User A's todo
  await TestValidator.error(
    "member user B cannot delete todo owned by member user A",
    async () => {
      await api.functional.todoApp.memberUser.todos.erase(userBConnection, {
        todoId: userATodo.id,
      });
    },
  );

  // 6. Verify that the todo still exists indirectly by allowing User A to delete it
  //    (if User A can delete it, it must not have been removed by User B).

  // 7 & 8. Owner deletion: User A deletes their own todo using the original connection
  const deletedTodoByUserA: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.erase(connection, {
      todoId: userATodo.id,
    });
  typia.assert<ITodoAppTodo>(deletedTodoByUserA);

  TestValidator.equals(
    "owner deletion should return the same todo id",
    deletedTodoByUserA.id,
    userATodo.id,
  );
}
