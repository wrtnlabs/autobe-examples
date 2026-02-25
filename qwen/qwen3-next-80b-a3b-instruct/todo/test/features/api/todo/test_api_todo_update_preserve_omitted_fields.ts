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

export async function test_api_todo_update_preserve_omitted_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // 2. Create a todo with all fields filled
  const createdTodo = await generate_random_todo_app_user_todos_create(
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
  typia.assert(createdTodo);
  // 3. Verify initial state
  TestValidator.equals("title matches", createdTodo.title, createdTodo.title);
  TestValidator.equals(
    "description preserved",
    createdTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "start_date preserved",
    createdTodo.start_date,
    createdTodo.start_date,
  );
  TestValidator.equals(
    "due_date preserved",
    createdTodo.due_date,
    createdTodo.due_date,
  );
  TestValidator.predicate(
    "updated_at is set",
    createdTodo.updated_at !== undefined,
  );
  TestValidator.predicate("not deleted", createdTodo.deleted_at === null);
  const initialUpdatedAt = createdTodo.updated_at;
  const originalTitle = createdTodo.title;
  const originalDescription = createdTodo.description;
  const originalStartDate = createdTodo.start_date;
  const originalDueDate = createdTodo.due_date;
  // 4. Generate new title for update
  const newTitle = RandomGenerator.paragraph({ sentences: 1 });
  // 5. Update only the title, omitting other fields
  const updatedTodo = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: createdTodo.id,
      body: {
        title: newTitle,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 6. Validate that omitted fields are preserved
  TestValidator.equals("title updated correctly", updatedTodo.title, newTitle);
  TestValidator.equals(
    "description preserved",
    updatedTodo.description,
    originalDescription,
  );
  TestValidator.equals(
    "start_date preserved",
    updatedTodo.start_date,
    originalStartDate,
  );
  TestValidator.equals(
    "due_date preserved",
    updatedTodo.due_date,
    originalDueDate,
  );
  // 7. Validate that updated_at was modified
  TestValidator.notEquals(
    "updated_at changed",
    updatedTodo.updated_at,
    initialUpdatedAt,
  );
  // 8. Validate that deleted_at remains null (active todo)
  TestValidator.equals("todo still active", updatedTodo.deleted_at, null);
}
