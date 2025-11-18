import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate comprehensive todo update with simultaneous text modification and
 * completion status change.
 *
 * This test ensures that multiple fields can be updated atomically in a single
 * operation while maintaining data consistency and proper audit trail
 * tracking.
 */
export async function test_api_todo_simultaneous_text_and_status_update(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      status: "active",
      href: "https://todoapp.example.com" satisfies string as string,
      referrer: "https://todoapp.example.com/signup" satisfies string as string,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create initial todo item
  const initialTodoText = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  }).substring(0, 100);
  const initialTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        text: initialTodoText satisfies string as string,
        completed: false,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(initialTodo);

  // Step 3: Perform simultaneous update of text and completion status
  const updatedTodoText = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  }).substring(0, 150);
  const updatedTodo = await api.functional.todoApp.user.todos.update(
    connection,
    {
      todoId: initialTodo.id,
      body: {
        text: updatedTodoText satisfies string as string,
        completed: true,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);

  // Step 4: Validate simultaneous update results
  TestValidator.equals(
    "todo ID remains unchanged",
    updatedTodo.id,
    initialTodo.id,
  );
  TestValidator.equals(
    "text content updated correctly",
    updatedTodo.text,
    updatedTodoText,
  );
  TestValidator.equals(
    "completion status updated to true",
    updatedTodo.completed,
    true,
  );
  TestValidator.equals(
    "creation timestamp unchanged",
    updatedTodo.created_at,
    initialTodo.created_at,
  );
  TestValidator.notEquals(
    "update timestamp changed",
    updatedTodo.updated_at,
    initialTodo.updated_at,
  );
  TestValidator.predicate(
    "updated timestamp is after creation",
    new Date(updatedTodo.updated_at).getTime() >
      new Date(initialTodo.created_at).getTime(),
  );
}
