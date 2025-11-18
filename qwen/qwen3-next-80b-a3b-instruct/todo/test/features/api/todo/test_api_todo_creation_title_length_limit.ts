import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validates that creating a todo with a title exceeding the 255-character limit
 * is properly rejected.
 *
 * Business flow:
 *
 * 1. Register a new user via /auth/user/join.
 * 2. Attempt to create a todo for this user using /todo/user/todos with a title of
 *    length 256, which exceeds the allowed 255 characters.
 * 3. Confirm that the API responds with a validation error and the illegal todo is
 *    not created, preserving business and database integrity.
 */
export async function test_api_todo_creation_title_length_limit(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = RandomGenerator.alphaNumeric(12);
  const user: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email,
        password,
        ip: undefined,
        href: "https://testclient.local/join",
        referrer: "https://testclient.local/landing-page",
      } satisfies ITodoUser.IJoin,
    },
  );
  typia.assert(user);

  // 2. Attempt to create a todo with a too-long title string
  const invalidTitle = RandomGenerator.alphabets(256); // length 256 > 255
  await TestValidator.error(
    "should reject todo creation when title exceeds 255 characters",
    async () => {
      await api.functional.todo.user.todos.create(connection, {
        body: {
          title: invalidTitle as string, // purposely 256 chars, violating tags.MaxLength<255>
          description: "Content exceeding title length for validation test",
        } satisfies ITodoTodo.ICreate,
      });
    },
  );
}
