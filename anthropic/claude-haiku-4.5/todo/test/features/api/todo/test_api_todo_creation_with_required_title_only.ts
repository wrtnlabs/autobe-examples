import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test basic todo creation with only the required title field.
 *
 * This test validates that a user can create a todo item with just the required
 * title field, and that the system properly assigns default values for optional
 * fields (status='active', priority='medium'), auto-generates a unique ID,
 * records the creation timestamp, and returns the complete todo object.
 *
 * Process:
 *
 * 1. Register a new user account for todo operations
 * 2. Create a todo with only a required title
 * 3. Verify the todo creation succeeds
 * 4. Validate that system-generated fields are properly set (ID, status, priority,
 *    timestamps)
 * 5. Confirm the response contains the complete todo object with all fields
 */
export async function test_api_todo_creation_with_required_title_only(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: RandomGenerator.alphabets(8),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);
  TestValidator.equals("user registered successfully", user.status, "active");

  // Step 2: Create a todo with only the required title field
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: todoTitle,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Validate todo creation succeeded with correct title
  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoTitle,
  );

  // Step 4: Verify system-generated fields are properly set
  TestValidator.predicate(
    "todo has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdTodo.id,
    ),
  );
  TestValidator.equals(
    "todo user_id matches authenticated user",
    createdTodo.todo_app_user_id,
    user.id,
  );
  TestValidator.equals(
    "todo status defaults to active",
    createdTodo.status,
    "active",
  );
  TestValidator.equals(
    "todo priority defaults to medium",
    createdTodo.priority,
    "medium",
  );
  TestValidator.predicate(
    "todo created_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      createdTodo.created_at,
    ),
  );
  TestValidator.predicate(
    "todo updated_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      createdTodo.updated_at,
    ),
  );

  // Step 5: Verify optional fields are not set (description and due_date should be null/undefined)
  TestValidator.predicate(
    "todo description is null or undefined",
    createdTodo.description === null || createdTodo.description === undefined,
  );
  TestValidator.predicate(
    "todo due_date is null or undefined",
    createdTodo.due_date === null || createdTodo.due_date === undefined,
  );
  TestValidator.predicate(
    "todo completed_at is null or undefined",
    createdTodo.completed_at === null || createdTodo.completed_at === undefined,
  );
}
