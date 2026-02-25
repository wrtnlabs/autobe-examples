import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_history_privacy_other_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. User A Setup - Create and authenticate User A
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.MaxLength<254> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(userA);
  // 2. Create a todo as User A
  const todoA = await generate_random_todo_app_user_todos_create(
    userAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todoA);
  // 3. Edit the todo to generate history entries
  await api.functional.todoApp.user.todos.update(userAConnection, {
    todoId: todoA.id,
    body: {
      title: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ITodoAppTodo.IUpdate,
  });
  await api.functional.todoApp.user.todos.update(userAConnection, {
    todoId: todoA.id,
    body: {
      description: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies ITodoAppTodo.IUpdate,
  });
  // 4. User B Setup - Create and authenticate a different user
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.MaxLength<254> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(userB);
  // 5. User B attempts to access User A's todo history
  // This should fail with authorization error
  await TestValidator.httpError(
    "User B cannot access User A's todo history",
    [403, 404],
    async () => {
      await api.functional.todoApp.user.todos.histories.index(userBConnection, {
        todoId: todoA.id,
        body: {} satisfies ITodoAppTodoHistory.IRequest,
      });
    },
  );
}