import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { generate_random_todo_app_todo_user_todos_create } from "../../../generate/generate_random_todo_app_todo_user_todos_create";
import { authorize_todo_user_join } from "../../../authorize/authorize_todo_user_join";
import { authorize_todo_user_login } from "../../../authorize/authorize_todo_user_login";
import { authorize_todo_user_refresh } from "../../../authorize/authorize_todo_user_refresh";
export async function test_api_todo_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user and authenticate
  const todoUserConnection: api.IConnection = { host: connection.host };
  const user = await authorize_todo_user_join(todoUserConnection, {
    body: {
      email: `test-${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://todo.wrtn.io/register",
      referrer: "https://todo.wrtn.io",
    },
  });
  // Step 2: Create a todo item
  const initialTodo = await generate_random_todo_app_todo_user_todos_create(
    todoUserConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      },
    },
  );
  // Step 3: Prepare updated values for all editable fields
  const updatedTitle = RandomGenerator.name(3);
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedStartDate = new Date(Date.now() + 172800000).toISOString(); // Day after tomorrow
  const updatedDueDate = new Date(Date.now() + 259200000).toISOString(); // 3 days from now
  // Step 4: Update the todo with all fields changed
  const updatedTodo = await api.functional.todoApp.todoUser.todos.update(
    todoUserConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
        startDate: updatedStartDate,
        dueDate: updatedDueDate,
      },
    },
  );
  typia.assert(updatedTodo);
  // Step 5: Validate that all fields were updated correctly
  TestValidator.equals("todo title updated", updatedTodo.title, updatedTitle);
  TestValidator.equals(
    "todo description updated",
    updatedTodo.description,
    updatedDescription,
  );
  TestValidator.equals(
    "todo start date updated",
    updatedTodo.startDate,
    updatedStartDate,
  );
  TestValidator.equals(
    "todo due date updated",
    updatedTodo.dueDate,
    updatedDueDate,
  );
  // Step 6: Also verify that unchanging fields remain the same
  TestValidator.equals(
    "todo completion status unchanged",
    updatedTodo.completed,
    initialTodo.completed,
  );
  TestValidator.equals(
    "todo owner unchanged",
    updatedTodo.todoUser.id,
    initialTodo.todoUser.id,
  );
  TestValidator.equals(
    "todo creation time unchanged",
    updatedTodo.createdAt,
    initialTodo.createdAt,
  );
  TestValidator.predicate(
    "todo updated time changed",
    updatedTodo.updatedAt > initialTodo.updatedAt,
  );
}
