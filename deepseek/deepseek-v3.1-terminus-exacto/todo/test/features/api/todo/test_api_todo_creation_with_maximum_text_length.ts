import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test todo creation with maximum text length requirement (500 characters).
 * Validates that the system properly handles the longest allowed todo
 * description while maintaining performance and data storage constraints.
 */
export async function test_api_todo_creation_with_maximum_text_length(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user
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

  // Step 2: Create a todo with maximum text length (500 characters)
  const maxLengthText = typia.random<
    string & tags.MinLength<500> & tags.MaxLength<500>
  >();
  const todo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      text: maxLengthText satisfies string &
        tags.MinLength<1> &
        tags.MaxLength<500>,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);

  // Step 3: Validate the created todo
  TestValidator.equals(
    "todo text matches input exactly",
    todo.text,
    maxLengthText,
  );
  TestValidator.equals(
    "todo text length is exactly 500 characters",
    todo.text.length,
    500,
  );
  TestValidator.equals(
    "todo completed status defaults to false",
    todo.completed,
    false,
  );

  // Step 4: Create another todo with shorter text to ensure the constraint is properly enforced
  const shortText = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<100>
  >();
  const shortTodo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      text: shortText satisfies string &
        tags.MinLength<1> &
        tags.MaxLength<500>,
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(shortTodo);

  TestValidator.equals(
    "shorter todo text matches input",
    shortTodo.text,
    shortText,
  );
  TestValidator.predicate(
    "shorter todo text length is within bounds",
    shortTodo.text.length > 0 && shortTodo.text.length <= 100,
  );
}
