import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test complete todo lifecycle from creation to retrieval.
 *
 * Validates that todos can be properly created and retrieved with all fields
 * intact, including text content, completion status, and timestamps. This test
 * ensures the API endpoints maintain data integrity throughout the todo
 * lifecycle.
 */
export async function test_api_todo_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/todo-app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a todo item
  const todoText = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const todo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      text: todoText,
      completed: false,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);

  // Step 3: Retrieve the todo by ID
  const retrievedTodo = await api.functional.todoApp.user.todos.at(connection, {
    todoId: todo.id,
  });
  typia.assert(retrievedTodo);

  // Step 4: Validate that retrieved todo matches created todo
  TestValidator.equals("todo ID matches", retrievedTodo.id, todo.id);
  TestValidator.equals("todo text matches", retrievedTodo.text, todo.text);
  TestValidator.equals(
    "completion status matches",
    retrievedTodo.completed,
    todo.completed,
  );
  TestValidator.equals(
    "created timestamp matches",
    retrievedTodo.created_at,
    todo.created_at,
  );
  TestValidator.equals(
    "updated timestamp matches",
    retrievedTodo.updated_at,
    todo.updated_at,
  );

  // Step 5: Validate business logic
  TestValidator.predicate(
    "todo text meets length requirements",
    todoText.length >= 1 && todoText.length <= 500,
  );
  TestValidator.predicate(
    "created timestamp is valid ISO string",
    !isNaN(new Date(todo.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated timestamp is valid ISO string",
    !isNaN(new Date(todo.updated_at).getTime()),
  );
}
