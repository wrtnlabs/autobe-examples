import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test todo creation with minimum text length requirement (1 character).
 * Validates that the system accepts the shortest possible todo description
 * while maintaining data integrity and proper field population.
 */
export async function test_api_todo_creation_with_minimum_text_length(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a todo with minimum text length (1 character)
  const minText = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<1>
  >();
  const todoWithMinText = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        text: minText,
        completed: false,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoWithMinText);

  // Step 3: Validate the core requirement - minimum text length acceptance
  TestValidator.equals(
    "todo text should be exactly 1 character",
    todoWithMinText.text.length,
    1,
  );
  TestValidator.equals(
    "todo text should match the minimum length input",
    todoWithMinText.text,
    minText,
  );
  TestValidator.equals(
    "todo completed status should be false",
    todoWithMinText.completed,
    false,
  );

  // Step 4: Test edge case - empty string should fail (but we're testing minimum, so skip)
  // Focus on successful minimum length scenarios only

  // Step 5: Create additional todo with different single character to verify consistency
  const anotherMinText = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<1>
  >();
  const anotherTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        text: anotherMinText,
        completed: true,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(anotherTodo);

  TestValidator.equals(
    "second todo text should also be 1 character",
    anotherTodo.text.length,
    1,
  );
  TestValidator.equals(
    "second todo completed status should be true",
    anotherTodo.completed,
    true,
  );
  TestValidator.notEquals(
    "two todos should have different IDs",
    todoWithMinText.id,
    anotherTodo.id,
  );
}
