import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful todo creation workflow for authenticated users.
 *
 * Validates the complete workflow where a user registers an account, obtains
 * authentication tokens, and creates a todo item with valid text content.
 * Ensures the todo is properly created with system-generated fields (id,
 * timestamps) and associated with the authenticated user.
 */
export async function test_api_todo_creation_by_authenticated_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: "https://todoapp.example.com/register" satisfies string as string &
        tags.Format<"uri">,
      referrer: "https://todoapp.example.com" satisfies string as string &
        tags.Format<"uri">,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a todo item using the authenticated connection
  const todoText = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 15,
  });

  const todo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      text: todoText satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<500>,
      completed: false,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);

  // Step 3: Validate the created todo contains all expected fields
  TestValidator.equals(
    "todo id is valid UUID format",
    typeof todo.id,
    "string",
  );
  TestValidator.predicate("todo text matches input", todo.text === todoText);
  TestValidator.equals("todo completed status is false", todo.completed, false);
  TestValidator.predicate(
    "created_at timestamp is present",
    typeof todo.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at timestamp is present",
    typeof todo.updated_at === "string",
  );
  TestValidator.equals(
    "deleted_at is undefined for new todo",
    todo.deleted_at,
    undefined,
  );
}
