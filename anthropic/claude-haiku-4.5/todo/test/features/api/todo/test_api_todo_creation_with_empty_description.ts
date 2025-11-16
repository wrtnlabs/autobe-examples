import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test todo creation with explicit null description.
 *
 * Validates that the todo application correctly handles creation of todo items
 * where the description field is explicitly set to null. This test verifies
 * that the system stores null descriptions properly and returns them in API
 * responses.
 *
 * The test workflow:
 *
 * 1. Create and authenticate a new user account
 * 2. Create a todo item with a title and null description
 * 3. Verify the response contains the created todo with null description
 * 4. Validate that is_completed defaults to false
 * 5. Confirm that timestamps are properly set
 */
export async function test_api_todo_creation_with_empty_description(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new user
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/landing",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  TestValidator.predicate(
    "user authenticated successfully",
    user.id !== null && user.token !== null,
  );

  // Step 2: Create a todo with title and null description
  const todoTitle = RandomGenerator.paragraph({ sentences: 2 });
  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: todoTitle,
        description: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);

  // Step 3: Verify todo properties
  TestValidator.equals("todo title matches input", todo.title, todoTitle);
  TestValidator.equals("description is null", todo.description, null);
  TestValidator.equals(
    "todo is not completed by default",
    todo.is_completed,
    false,
  );
  TestValidator.equals(
    "completed_at is null when not completed",
    todo.completed_at,
    null,
  );

  // Step 4: Verify timestamps are set
  TestValidator.predicate(
    "created_at is set",
    todo.created_at !== null && todo.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is set",
    todo.updated_at !== null && todo.updated_at !== undefined,
  );

  // Step 5: Verify user association
  TestValidator.equals(
    "todo belongs to authenticated user",
    todo.todo_app_user_id,
    user.id,
  );
  TestValidator.equals(
    "user summary matches authenticated user",
    todo.user.id,
    user.id,
  );
  TestValidator.equals(
    "user email in summary matches authenticated user",
    todo.user.email,
    user.email,
  );
}
