import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test basic todo creation workflow where an authenticated user creates a new
 * todo item with valid text content. Validates that the creation operation
 * returns the complete todo object with generated UUID, proper timestamps, and
 * default completion status. Verifies that the todo text meets the 1-500
 * character requirement and that the system correctly associates the todo with
 * the authenticated user.
 */
export async function test_api_todo_creation_basic(
  connection: api.IConnection,
) {
  // Step 1: Create an authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      name: RandomGenerator.name(),
      href: "https://example.com/todo",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Generate valid todo text that meets the 1-500 character requirement
  const todoText = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 3,
    wordMax: 8,
  });

  // Step 3: Create a new todo item using the authenticated connection
  const todo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      text: todoText,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);

  // Step 4: Validate the response contains all expected fields with proper types
  TestValidator.equals("todo text matches input", todo.text, todoText);
  TestValidator.predicate(
    "todo has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      todo.id,
    ),
  );
  TestValidator.predicate(
    "todo is not completed by default",
    todo.completed === false,
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(todo.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(todo.updated_at),
  );
  TestValidator.equals("deleted_at is undefined", todo.deleted_at, undefined);

  // Step 5: Verify the todo text length meets the 1-500 character requirement
  TestValidator.predicate(
    "todo text length between 1-500 characters",
    todo.text.length >= 1 && todo.text.length <= 500,
  );
}
