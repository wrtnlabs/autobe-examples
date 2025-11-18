import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test todo creation with maximum allowed text length (500 characters) to
 * validate boundary condition handling.
 *
 * This test ensures that the system properly accepts and stores todo items with
 * the maximum allowed text length of 500 characters. It validates that the text
 * length constraint specified in the ITodoAppTodo.ICreate DTO is correctly
 * enforced at the upper boundary.
 */
export async function test_api_todo_creation_maximum_text_length(
  connection: api.IConnection,
) {
  // 1. Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: "https://todoapp.example.com/register" satisfies string as string,
      referrer: "https://todoapp.example.com" satisfies string as string,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // 2. Generate todo text with exactly 500 characters
  const maxLengthText = RandomGenerator.alphabets(500);
  TestValidator.equals(
    "text length should be exactly 500 characters",
    maxLengthText.length,
    500,
  );

  // 3. Create todo with maximum text length
  const todo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      text: maxLengthText satisfies string as string,
      completed: false,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);

  // 4. Validate that the created todo contains the exact 500-character text
  TestValidator.equals(
    "todo text should match the input exactly",
    todo.text,
    maxLengthText,
  );
  TestValidator.equals(
    "todo text length should be 500 characters",
    todo.text.length,
    500,
  );
  TestValidator.predicate(
    "todo should be marked as incomplete",
    todo.completed === false,
  );
}
