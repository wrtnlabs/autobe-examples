import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test partial field updates for todo items.
 *
 * Validates that users can update only selected fields of a todo item while
 * preserving unchanged fields. This test:
 *
 * 1. Creates a user account through registration
 * 2. Creates a todo with title, description, priority, and due_date
 * 3. Updates only the title and priority fields
 * 4. Verifies that description and due_date remain unchanged
 * 5. Confirms the updated fields have the new values
 */
export async function test_api_todo_update_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: RandomGenerator.alphabets(10),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);

  // Step 2: Create a todo with multiple properties
  const originalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const originalDescription = RandomGenerator.paragraph({ sentences: 4 });
  const originalPriority = RandomGenerator.pick([
    "low",
    "medium",
    "high",
  ] as const);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const originalDueDate = tomorrow.toISOString().split("T")[0];

  const originalTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: originalTitle,
        description: originalDescription,
        priority: originalPriority,
        due_date: originalDueDate,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(originalTodo);

  // Verify initial values
  TestValidator.equals(
    "initial title matches",
    originalTodo.title,
    originalTitle,
  );
  TestValidator.equals(
    "initial description matches",
    originalTodo.description,
    originalDescription,
  );
  TestValidator.equals(
    "initial priority matches",
    originalTodo.priority,
    originalPriority,
  );
  TestValidator.equals(
    "initial due_date matches",
    originalTodo.due_date,
    originalDueDate,
  );

  // Step 3: Update only title and priority, leaving description and due_date unchanged
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const newPriority = RandomGenerator.pick(["low", "medium", "high"] as const);

  const updatedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.update(connection, {
      todoId: originalTodo.id,
      body: {
        title: newTitle,
        priority: newPriority,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(updatedTodo);

  // Step 4: Verify updated fields changed and unchanged fields remained the same
  TestValidator.equals(
    "updated title is new value",
    updatedTodo.title,
    newTitle,
  );
  TestValidator.equals(
    "updated priority is new value",
    updatedTodo.priority,
    newPriority,
  );
  TestValidator.equals(
    "description preserved unchanged",
    updatedTodo.description,
    originalDescription,
  );
  TestValidator.equals(
    "due_date preserved unchanged",
    updatedTodo.due_date,
    originalDueDate,
  );

  // Step 5: Verify status remains active (unchanged)
  TestValidator.equals("status remains active", updatedTodo.status, "active");

  // Step 6: Verify timestamps are correct
  TestValidator.equals(
    "created_at unchanged",
    updatedTodo.created_at,
    originalTodo.created_at,
  );
  TestValidator.predicate(
    "updated_at reflects modification",
    updatedTodo.updated_at >= originalTodo.updated_at,
  );
}
