import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_todo_edit_no_change(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  const initialTodo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(initialTodo);
  // Update with identical values
  const updatedTodo = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: initialTodo.title,
        description: initialTodo.description,
        start_date: initialTodo.start_date,
        due_date: initialTodo.due_date,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // Verify the returned todo matches the original
  TestValidator.equals(
    "todo unchanged after update",
    initialTodo.title,
    updatedTodo.title,
  );
  TestValidator.equals(
    "todo unchanged after update",
    initialTodo.description,
    updatedTodo.description,
  );
  TestValidator.equals(
    "todo unchanged after update",
    initialTodo.start_date,
    updatedTodo.start_date,
  );
  TestValidator.equals(
    "todo unchanged after update",
    initialTodo.due_date,
    updatedTodo.due_date,
  );
  TestValidator.equals(
    "todo unchanged after update",
    initialTodo.is_completed,
    updatedTodo.is_completed,
  );
  TestValidator.equals(
    "todo unchanged after update",
    initialTodo.created_at,
    updatedTodo.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    initialTodo.updated_at,
    updatedTodo.updated_at,
  );
  // Note: We cannot verify that no history entry was created because there is no API to read history entries.
  // This test verifies the update succeeded and returned correct data, as per API contract.
  // The business logic of suppressing history creation on no-change updates cannot be validated.
}
