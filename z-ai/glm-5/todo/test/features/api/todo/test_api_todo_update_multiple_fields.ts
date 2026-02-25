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

/**
 * Test updating multiple todo fields simultaneously.
 *
 * 1. Authenticate user via join
 * 2. Create a todo with initial values (title, description, start_date, due_date)
 * 3. Update all four fields (title, description, start_date, due_date) in a single PUT request
 * 4. Verify all fields are updated correctly in the response
 * 5. Verify updated_at timestamp is newer than created_at
 */
export async function test_api_todo_update_multiple_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create a todo with initial values
  const initialTitle = "Initial Todo Title";
  const initialDescription = "Initial description for the todo item";
  const initialStartDate = new Date("2026-03-01T09:00:00Z").toISOString();
  const initialDueDate = new Date("2026-03-15T18:00:00Z").toISOString();
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: initialTitle,
        description: initialDescription,
        startDate: initialStartDate,
        dueDate: initialDueDate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Verify initial values
  TestValidator.equals("initial title", todo.title, initialTitle);
  TestValidator.equals(
    "initial description",
    todo.description,
    initialDescription,
  );
  TestValidator.equals("initial startDate", todo.startDate, initialStartDate);
  TestValidator.equals("initial dueDate", todo.dueDate, initialDueDate);
  // Store created_at for comparison
  const createdAt = todo.createdAt;
  // 3. Update all four fields simultaneously
  const newTitle = "Updated Todo Title";
  const newDescription = "Updated description with new content";
  const newStartDate = new Date("2026-04-01T10:00:00Z").toISOString();
  const newDueDate = new Date("2026-04-30T17:00:00Z").toISOString();
  const updatedTodo = await api.functional.todoApp.user.todos.update(
    userConnection,
    {
      todoId: todo.id,
      body: {
        title: newTitle,
        description: newDescription,
        start_date: newStartDate,
        due_date: newDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Verify all fields are updated correctly
  TestValidator.equals("updated title", updatedTodo.title, newTitle);
  TestValidator.equals(
    "updated description",
    updatedTodo.description,
    newDescription,
  );
  TestValidator.equals(
    "updated startDate",
    updatedTodo.startDate,
    newStartDate,
  );
  TestValidator.equals("updated dueDate", updatedTodo.dueDate, newDueDate);
  // 5. Verify updated_at is newer than created_at
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedTodo.updatedAt) > new Date(createdAt),
  );
  // Verify todo id remains the same
  TestValidator.equals("todo id unchanged", updatedTodo.id, todo.id);
  // Verify completion and deletion status remain unchanged
  TestValidator.equals(
    "completion status unchanged",
    updatedTodo.isCompleted,
    false,
  );
  TestValidator.equals(
    "deletion status unchanged",
    updatedTodo.isDeleted,
    false,
  );
}
