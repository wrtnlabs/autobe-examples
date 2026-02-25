import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrincipal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrincipal";
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

/**
 * Test successful retrieval of edit history for a todo item owned by the authenticated user.
 * 1. Create authenticated user and authenticate
 * 2. Create a todo item
 * 3. Edit the todo item multiple times to generate history entries
 * 4. Retrieve the edit history and validate contents and sorting
 */
export async function test_api_todo_edit_history_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.todoApp.auth.user.join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Update connection with user's authentication token
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: `Bearer ${user.token.access}`,
  };
  // 2. Create a todo item
  const todo = await api.functional.todoApp.user.todos.create(userConnection, {
    body: {
      title: RandomGenerator.name(3),
      description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  // 3. Edit the todo item multiple times to generate history entries
  const editCount = 3;
  for (let i = 0; i < editCount; i++) {
    await api.functional.todoApp.user.todos.update(userConnection, {
      todoId: todo.id,
      body: {
        title: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.IUpdate,
    });
  }
  // 4. Retrieve the edit history and validate contents
  const historyResponse = await api.functional.todoApp.user.todos.history(
    userConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(historyResponse);
  // Validate that history entry has required fields
  TestValidator.equals(
    "history entry belongs to correct todo",
    historyResponse.todoId,
    todo.id,
  );
  TestValidator.predicate(
    "history entry has valid ID",
    /^[0-9a-f-]{36}$/i.test(historyResponse.id),
  );
  TestValidator.predicate(
    "history entry has timestamp",
    typeof historyResponse.editedAt === "string",
  );
}
