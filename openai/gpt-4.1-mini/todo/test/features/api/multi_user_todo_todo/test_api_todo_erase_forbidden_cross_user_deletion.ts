import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_multi_user_todo_user_todos_create } from "../../../generate/generate_random_multi_user_todo_user_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_todo_erase_forbidden_cross_user_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as user A (user join)
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: `usera+${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "password123",
      displayName: "User A",
      href: "http://localhost/join",
      referrer: "http://localhost/referrer",
      ip: null,
    },
  });
  userAConnection.headers ??= {};
  userAConnection.headers.Authorization = `Bearer ${userA.token.access}`;
  typia.assert(userA);
  // 2. Authenticate as user B (user join) and create a todo
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {
    body: {
      email: `userb+${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "password123",
      displayName: "User B",
      href: "http://localhost/join",
      referrer: "http://localhost/referrer",
      ip: null,
    },
  });
  userBConnection.headers ??= {};
  userBConnection.headers.Authorization = `Bearer ${userB.token.access}`;
  typia.assert(userB);
  const todo = await generate_random_multi_user_todo_user_todos_create(
    userBConnection,
    {
      body: {
        title: "Do not delete me",
        description: "A todo owned by User B",
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      },
    },
  );
  typia.assert(todo);
  // 3. Try to delete user B's todo with user A's authentication
  await TestValidator.httpError(
    "forbidden deletion by another user",
    [403, 404],
    async () => {
      await api.functional.multiUserTodo.user.todos.erase(userAConnection, {
        todoId: todo.id,
      });
    },
  );
}
