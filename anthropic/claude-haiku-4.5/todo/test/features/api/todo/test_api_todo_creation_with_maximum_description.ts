import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test edge case of todo creation with the maximum valid description length
 * (2000 characters).
 *
 * User authenticates and creates a todo with a valid title and a 2000-character
 * description. Verify the system accepts the maximum description and stores it
 * completely without truncation. This validates the upper boundary of the
 * description length constraint (maxLength: 2000).
 *
 * Test flow:
 *
 * 1. User joins and authenticates with valid credentials
 * 2. User creates a todo with a valid title and maximum-length description (2000
 *    chars)
 * 3. System accepts the todo and returns the complete description unchanged
 * 4. Response validates that all 2000 characters are stored and retrieved
 *    correctly
 */
export async function test_api_todo_creation_with_maximum_description(
  connection: api.IConnection,
) {
  // 1. User joins and authenticates
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Generate a description with exactly 2000 characters
  const description = RandomGenerator.alphaNumeric(2000);

  TestValidator.predicate(
    "generated description should have exactly 2000 characters",
    description.length === 2000,
  );

  // 3. Create todo with maximum-length description
  const todo: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: description,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);

  // 4. Validate the response preserves the maximum description without truncation
  const responseDescription = typia.assert(todo.description!);

  TestValidator.equals(
    "todo description should match input exactly",
    responseDescription,
    description,
  );

  TestValidator.equals(
    "todo description length should be preserved at 2000 characters",
    responseDescription.length,
    2000,
  );

  TestValidator.predicate(
    "todo should not be marked as completed initially",
    todo.is_completed === false,
  );

  TestValidator.predicate(
    "todo should be associated with the authenticated user",
    todo.todo_app_user_id === user.id,
  );
}
