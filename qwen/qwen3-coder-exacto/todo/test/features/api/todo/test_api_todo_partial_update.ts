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
export async function test_api_todo_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new todo user and authenticate
  const todoUserConnection: api.IConnection = { host: connection.host };
  const user = await authorize_todo_user_join(todoUserConnection, {
    body: {
      email: "test@example.com",
      password: "password123",
      href: "https://todo.wrtn.io/register",
      referrer: "https://todo.wrtn.io",
    },
  });
  // Step 2: Create a todo item
  const todo = await generate_random_todo_app_todo_user_todos_create(
    todoUserConnection,
    {
      body: {
        title: "Original Title",
        description: "Original Description",
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      },
    },
  );
  // Step 3: Partially update the todo (only title)
  const updatedTodo = await api.functional.todoApp.todoUser.todos.update(
    todoUserConnection,
    {
      todoId: todo.id,
      body: {
        title: "Updated Title",
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  // Validate that only the title changed
  TestValidator.equals("title updated", updatedTodo.title, "Updated Title");
  TestValidator.equals(
    "description unchanged",
    updatedTodo.description,
    todo.description,
  );
  TestValidator.equals(
    "startDate unchanged",
    updatedTodo.startDate,
    todo.startDate,
  );
  TestValidator.equals("dueDate unchanged", updatedTodo.dueDate, todo.dueDate);
  TestValidator.equals(
    "completed status unchanged",
    updatedTodo.completed,
    todo.completed,
  );
  // Step 4: Partially update the todo (only description to null)
  const updatedTodo2 = await api.functional.todoApp.todoUser.todos.update(
    todoUserConnection,
    {
      todoId: todo.id,
      body: {
        description: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  // Validate that only the description changed
  TestValidator.equals(
    "title unchanged",
    updatedTodo2.title,
    updatedTodo.title,
  );
  TestValidator.equals(
    "description updated to null",
    updatedTodo2.description,
    null,
  );
  TestValidator.equals(
    "startDate unchanged",
    updatedTodo2.startDate,
    todo.startDate,
  );
  TestValidator.equals("dueDate unchanged", updatedTodo2.dueDate, todo.dueDate);
  TestValidator.equals(
    "completed status unchanged",
    updatedTodo2.completed,
    todo.completed,
  );
  // Step 5: Partially update the todo (both startDate and dueDate)
  const newStartDate = new Date(Date.now() + 172800000).toISOString(); // In 2 days
  const newDueDate = new Date(Date.now() + 259200000).toISOString(); // In 3 days
  const updatedTodo3 = await api.functional.todoApp.todoUser.todos.update(
    todoUserConnection,
    {
      todoId: todo.id,
      body: {
        startDate: newStartDate,
        dueDate: newDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  // Validate that only startDate and dueDate changed
  TestValidator.equals(
    "title unchanged",
    updatedTodo3.title,
    updatedTodo2.title,
  );
  TestValidator.equals(
    "description unchanged",
    updatedTodo3.description,
    updatedTodo2.description,
  );
  TestValidator.equals(
    "startDate updated",
    updatedTodo3.startDate,
    newStartDate,
  );
  TestValidator.equals("dueDate updated", updatedTodo3.dueDate, newDueDate);
  TestValidator.equals(
    "completed status unchanged",
    updatedTodo3.completed,
    todo.completed,
  );
  // Step 6: Verify the edit history was properly recorded
  // The edit history functionality is automatically managed by the system
  // and we don't have direct access to it through the API in this test
  // But we can verify that the updatedAt timestamp has changed
  TestValidator.predicate(
    "updatedAt timestamp changed after updates",
    () => new Date(updatedTodo3.updatedAt) > new Date(todo.updatedAt),
  );
  // Verify that the current todo data matches our expectations
  typia.assert(updatedTodo3);
}
