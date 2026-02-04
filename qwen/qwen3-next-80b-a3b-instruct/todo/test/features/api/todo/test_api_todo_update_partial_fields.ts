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

export async function test_api_todo_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate user to create todo item
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(user);
  // Step 2: Create a todo item with start_date and due_date
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(), // 24 hours later
      },
    },
  );
  typia.assert(todo);
  // Store original values for validation
  const originalStartDate = todo.start_date;
  const originalDueDate = todo.due_date;
  const originalUpdatedAt = todo.updated_at;
  // Step 3: Perform partial update with only title and description
  const updatedTodo = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: todo.id,
      body: {
        title: "Updated Title",
        description: "Updated description content",
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // Step 4: Validate that unchanged fields retain original values
  TestValidator.equals(
    "start_date unchanged",
    updatedTodo.start_date,
    originalStartDate,
  );
  TestValidator.equals(
    "due_date unchanged",
    updatedTodo.due_date,
    originalDueDate,
  );
  // Step 5: Validate that updated_at timestamp was refreshed (newer than original)
  TestValidator.predicate(
    "updated_at refreshed",
    new Date(updatedTodo.updated_at) > new Date(originalUpdatedAt),
  );
  // Step 6: Validate that updated fields have new values
  TestValidator.equals("title updated", updatedTodo.title, "Updated Title");
  TestValidator.equals(
    "description updated",
    updatedTodo.description,
    "Updated description content",
  );
  // Step 7: Validate that completion_status and is_deleted remain unchanged (should be false)
  TestValidator.equals(
    "completion_status unchanged",
    updatedTodo.completion_status,
    false,
  );
  TestValidator.equals("is_deleted unchanged", updatedTodo.is_deleted, false);
}
