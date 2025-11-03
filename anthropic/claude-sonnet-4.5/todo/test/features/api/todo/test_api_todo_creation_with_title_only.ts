import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that users can create todo items with only the required title field,
 * without providing an optional description.
 *
 * This test validates the optional nature of the description field by creating
 * a todo with minimal required data (only title), verifying that the system:
 *
 * - Accepts the creation request with just a title
 * - Properly handles the missing optional description field
 * - Assigns the todo to the authenticated user
 * - Sets appropriate defaults (status to 'incomplete')
 * - Records proper timestamps
 * - Returns the complete todo object
 *
 * Workflow:
 *
 * 1. Register a new user account and authenticate
 * 2. Create a todo item with only a title (no description)
 * 3. Validate the returned todo object structure and values
 */
export async function test_api_todo_creation_with_title_only(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account to establish authentication context
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.IRegister;

  const authorizedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationData,
    });
  typia.assert(authorizedUser);

  // Step 2: Create a todo item with only a title (no description)
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const createTodoData = {
    title: todoTitle,
  } satisfies ITodoListTodo.ICreate;

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: createTodoData,
    });
  typia.assert(createdTodo);

  // Step 3: Validate the returned todo object
  TestValidator.equals(
    "todo is assigned to authenticated user",
    createdTodo.todo_list_user_id,
    authorizedUser.id,
  );

  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoTitle,
  );

  TestValidator.equals(
    "status defaults to incomplete",
    createdTodo.status,
    "incomplete",
  );
}
