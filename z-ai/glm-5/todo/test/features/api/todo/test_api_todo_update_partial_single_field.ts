import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

export async function test_api_todo_update_partial_single_field(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create a todo with all fields populated
  const originalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const originalDescription = RandomGenerator.content({ paragraphs: 2 });
  const originalStartDate = new Date().toISOString();
  const originalDueDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: originalTitle,
        description: originalDescription,
        startDate: originalStartDate,
        dueDate: originalDueDate,
      },
    },
  );
  typia.assert(todo);
  // 3. Update only the title field (partial update)
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedTodo = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: todo.id,
      body: {
        title: newTitle,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Verify partial update behavior
  TestValidator.equals("title should be updated", updatedTodo.title, newTitle);
  TestValidator.equals(
    "description should remain unchanged",
    updatedTodo.description,
    originalDescription,
  );
  TestValidator.equals(
    "startDate should remain unchanged",
    updatedTodo.startDate,
    originalStartDate,
  );
  TestValidator.equals(
    "dueDate should remain unchanged",
    updatedTodo.dueDate,
    originalDueDate,
  );
  TestValidator.predicate(
    "updatedAt should be newer",
    new Date(updatedTodo.updatedAt).getTime() >=
      new Date(todo.updatedAt).getTime(),
  );
}
