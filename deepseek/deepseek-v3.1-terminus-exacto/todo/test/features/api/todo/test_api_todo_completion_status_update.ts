import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test todo completion status update workflow.
 *
 * Validates the complete lifecycle of a todo item from creation to completion.
 * User authenticates, creates an incomplete todo, then updates it to completed
 * status. Verifies proper status transitions, timestamp updates, and data
 * integrity throughout the process.
 */
export async function test_api_todo_completion_status_update(
  connection: api.IConnection,
) {
  // Step 1: User authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "TestPassword123",
      name: RandomGenerator.name(),
      href: "https://todoapp.example.com/register",
      referrer: "https://todoapp.example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create initial incomplete todo with proper length constraint
  const initialTodoText = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  }).substring(0, 500); // Ensure text length <= 500 characters
  const initialTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        text: initialTodoText,
        completed: false,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(initialTodo);
  TestValidator.equals(
    "initial todo should be incomplete",
    initialTodo.completed,
    false,
  );
  TestValidator.equals(
    "todo text should match input",
    initialTodo.text,
    initialTodoText,
  );

  // Step 3: Update todo to completed status
  const updatedTodo = await api.functional.todoApp.user.todos.update(
    connection,
    {
      todoId: initialTodo.id,
      body: {
        completed: true,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);

  // Step 4: Validate completion status transition
  TestValidator.equals(
    "todo should now be completed",
    updatedTodo.completed,
    true,
  );
  TestValidator.equals(
    "text content should remain unchanged",
    updatedTodo.text,
    initialTodo.text,
  );
  TestValidator.equals(
    "todo ID should remain consistent",
    updatedTodo.id,
    initialTodo.id,
  );
  TestValidator.predicate(
    "updated_at should be later than created_at",
    updatedTodo.updated_at > initialTodo.created_at,
  );
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedTodo.updated_at,
    initialTodo.updated_at,
  );
}
