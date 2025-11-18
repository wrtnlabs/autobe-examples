import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test todo creation with explicit completion status specification.
 *
 * This E2E test validates that the todo creation API properly handles
 * user-provided completion status values. It creates multiple todo items with
 * different completion status settings (true, false, and undefined) to verify
 * that the system respects explicit status assignments and provides appropriate
 * default behavior when no status is specified.
 *
 * The test follows a complete user workflow:
 *
 * 1. Create authenticated user account
 * 2. Create todo with completed=true
 * 3. Create todo with completed=false
 * 4. Create todo without explicit completion status
 * 5. Validate all created todos have correct status and system-generated fields
 */
export async function test_api_todo_creation_with_completion_status(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      name: RandomGenerator.name(),
      href: "https://todoapp.example.com/register",
      referrer: "https://todoapp.example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create todo with completed=true
  const completedTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        text: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        completed: true,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(completedTodo);
  TestValidator.equals(
    "completed todo should have status true",
    completedTodo.completed,
    true,
  );

  // Step 3: Create todo with completed=false
  const incompleteTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        text: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 10,
        }),
        completed: false,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(incompleteTodo);
  TestValidator.equals(
    "incomplete todo should have status false",
    incompleteTodo.completed,
    false,
  );

  // Step 4: Create todo without explicit completion status
  const defaultTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        text: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 2,
          wordMax: 6,
        }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(defaultTodo);
  TestValidator.equals(
    "default todo should have status false",
    defaultTodo.completed,
    false,
  );

  // Step 5: Validate system-generated fields for all todos
  const todos = [completedTodo, incompleteTodo, defaultTodo];

  // Step 6: Validate that all todos have unique IDs
  const todoIds = todos.map((todo) => todo.id);
  const uniqueIds = new Set(todoIds);
  TestValidator.equals(
    "all todos should have unique IDs",
    uniqueIds.size,
    todoIds.length,
  );

  // Step 7: Validate completion status diversity
  TestValidator.notEquals(
    "completed todos should have different status values",
    completedTodo.completed,
    incompleteTodo.completed,
  );
  TestValidator.equals(
    "incomplete and default todos should have same status",
    incompleteTodo.completed,
    defaultTodo.completed,
  );
}
