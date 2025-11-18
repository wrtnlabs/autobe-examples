import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test partial update focusing only on completion status modification while
 * leaving text content unchanged. Validates that users can toggle completion
 * status independently without affecting the todo description.
 */
export async function test_api_todo_partial_update_status_only(
  connection: api.IConnection,
) {
  // Step 1: Create user account through authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";
  const userName = RandomGenerator.name();

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: userName,
      status: "active",
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create initial todo item with specific text and completion status
  const initialTodoText = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  }).substring(0, 100); // Ensure text length constraint (1-500 characters)
  const initialCompletedStatus = false;

  const createdTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        text: initialTodoText,
        completed: initialCompletedStatus,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Verify initial todo properties
  TestValidator.equals(
    "initial todo text matches",
    createdTodo.text,
    initialTodoText,
  );
  TestValidator.equals(
    "initial todo completed status",
    createdTodo.completed,
    initialCompletedStatus,
  );

  // Step 3: Perform partial update that only modifies completion status
  const updatedCompletedStatus = true;

  const updatedTodo = await api.functional.todoApp.user.todos.update(
    connection,
    {
      todoId: createdTodo.id,
      body: {
        completed: updatedCompletedStatus,
        // text field intentionally omitted to test partial update
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);

  // Step 4: Verify partial update results
  TestValidator.equals(
    "text remains unchanged after status-only update",
    updatedTodo.text,
    initialTodoText,
  );
  TestValidator.equals(
    "completion status is updated",
    updatedTodo.completed,
    updatedCompletedStatus,
  );
  TestValidator.notEquals(
    "completion status changed from initial value",
    updatedTodo.completed,
    initialCompletedStatus,
  );
  TestValidator.equals(
    "todo ID remains the same",
    updatedTodo.id,
    createdTodo.id,
  );

  // Additional validation: Ensure updated_at timestamp is newer
  const createdTimestamp = new Date(createdTodo.updated_at).getTime();
  const updatedTimestamp = new Date(updatedTodo.updated_at).getTime();
  TestValidator.predicate(
    "updated_at timestamp should be newer after update",
    updatedTimestamp > createdTimestamp,
  );
}
