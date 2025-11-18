import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test todo creation with a title of exactly 1 character (minimum allowed
 * length).
 *
 * Validates the lower boundary of the title length constraint by creating a
 * todo with a single-character title. This ensures that minimum-length titles
 * are accepted and stored correctly, with all metadata fields properly
 * populated.
 *
 * Test workflow:
 *
 * 1. Authenticate user via registration
 * 2. Create todo with 1-character title
 * 3. Validate successful creation and correct data persistence
 */
export async function test_api_todo_creation_with_minimum_length_title(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user by registering a new account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const authenticatedUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(authenticatedUser);

  // Step 2: Create todo with minimum length title (1 character)
  const minimumLengthTitle = "a";

  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: minimumLengthTitle,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Step 3: Validate the created todo
  TestValidator.equals(
    "todo title should match minimum length input",
    createdTodo.title,
    minimumLengthTitle,
  );

  TestValidator.equals(
    "todo title length should be exactly 1",
    createdTodo.title.length,
    1,
  );

  TestValidator.equals(
    "new todo should be incomplete by default",
    createdTodo.completed,
    false,
  );

  TestValidator.equals(
    "todo should belong to authenticated user",
    createdTodo.todo_list_user_id,
    authenticatedUser.id,
  );
}
