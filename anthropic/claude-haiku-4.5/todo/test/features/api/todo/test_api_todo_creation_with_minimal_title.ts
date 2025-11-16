import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test edge case of todo creation with minimal title length.
 *
 * This test validates that the system correctly handles the lower boundary of
 * the title length constraint. It creates a new user account, authenticates
 * them, and then creates a todo with a single-character title (the minimum
 * valid length). The test verifies that:
 *
 * 1. User registration and authentication succeeds
 * 2. Todo creation accepts a 1-character title
 * 3. The created todo contains all required fields
 * 4. The response matches the expected ITodoAppTodo structure
 *
 * Step-by-step process:
 *
 * 1. Register and authenticate a new user
 * 2. Create a todo with a minimal 1-character title
 * 3. Verify the response contains all required fields
 * 4. Validate that the todo properties match expected values
 */
export async function test_api_todo_creation_with_minimal_title(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10); // Ensure 8+ chars for password requirement

  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: email,
        password: password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);
  TestValidator.equals(
    "user email matches registration input",
    user.email,
    email,
  );

  // Step 2: Create a todo with a minimal 1-character title
  const minimalTitle = "A"; // Single character, minimum valid length

  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: minimalTitle,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);

  // Step 3: Verify the response contains all required fields and expected values
  TestValidator.equals(
    "todo title matches minimal input",
    todo.title,
    minimalTitle,
  );

  TestValidator.equals(
    "todo is initially not completed",
    todo.is_completed,
    false,
  );

  TestValidator.equals(
    "todo user id matches authenticated user",
    todo.todo_app_user_id,
    user.id,
  );

  TestValidator.equals(
    "todo user summary email matches authenticated user",
    todo.user.email,
    user.email,
  );

  TestValidator.predicate(
    "todo has no description since not provided",
    todo.description === null || todo.description === undefined,
  );
}
