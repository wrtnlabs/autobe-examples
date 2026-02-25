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

export async function test_api_todo_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  // 2. Create a todo to update with all optional fields set
  const createdTodo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  // 3. Verify todo is active and owned by user
  TestValidator.equals("todo is active", createdTodo.deleted_at, null);
  // 4. Update todo with only title changed (preserve description, start_date, due_date)
  const updatedTodo = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: createdTodo.id,
      body: {
        title: RandomGenerator.name(),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 5. Validate update results: title changed, others preserved
  TestValidator.notEquals(
    "title was updated",
    updatedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "description preserved",
    updatedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "start_date preserved",
    updatedTodo.start_date,
    createdTodo.start_date,
  );
  TestValidator.equals(
    "due_date preserved",
    updatedTodo.due_date,
    createdTodo.due_date,
  );
  TestValidator.predicate(
    "updated_at is newer",
    () => new Date(updatedTodo.updated_at) > new Date(createdTodo.updated_at),
  );
  TestValidator.equals("deleted_at remains null", updatedTodo.deleted_at, null);
  // 6. Compare user display_name instead of id (ISummary has no id property)
  TestValidator.equals(
    "user display_name unchanged",
    updatedTodo.user.display_name,
    createdTodo.user.display_name,
  );
}
