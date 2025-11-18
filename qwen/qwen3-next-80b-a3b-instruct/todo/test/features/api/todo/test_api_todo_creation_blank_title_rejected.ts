import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate rejection of blank or whitespace-only todo titles.
 *
 * This test ensures the todo creation endpoint enforces business validation and
 * does not allow a blank ("") or whitespace-only title for new todo items. It
 * covers two cases:
 *
 * 1. Blank title string ('')
 * 2. Title containing only whitespace (e.g., " ", "\t\n")
 *
 * The test confirms the backend upholds non-empty, non-blank title constraints,
 * as described in the schema. It also checks that no todo is created in
 * violation of these rules and a validation error is returned.
 *
 * Steps:
 *
 * 1. Register a new user (establishes authentication context)
 * 2. Authenticate as the user
 * 3. Attempt to create a todo with a blank title ("") - expect error
 * 4. Attempt to create a todo with whitespace-only title (e.g., " ", "\t\n") -
 *    expect error
 */
export async function test_api_todo_creation_blank_title_rejected(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const authorized: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email,
        password,
        ip: undefined,
        href: "https://example.com/signup",
        referrer: "https://example.com/landing",
      } satisfies ITodoUser.IJoin,
    },
  );
  typia.assert(authorized);

  // 2. (already authenticated as per token auto-handling)

  // 3. Attempt to create with blank title
  await TestValidator.error("blank title should be rejected", async () => {
    await api.functional.todo.user.todos.create(connection, {
      body: {
        title: "" as string & tags.MinLength<1> & tags.MaxLength<255>,
        description: "Trying to create with blank title",
      } satisfies ITodoTodo.ICreate,
    });
  });

  // 4. Attempt to create with whitespace-only title
  const whitespaceTitles = ["   ", "\t\n", "      ", "\r\n \t"];
  for (const whitespace of whitespaceTitles) {
    await TestValidator.error(
      `whitespace-only title ('${JSON.stringify(whitespace)}') should be rejected`,
      async () => {
        await api.functional.todo.user.todos.create(connection, {
          body: {
            title: whitespace as string &
              tags.MinLength<1> &
              tags.MaxLength<255>,
            description: "Trying to create with whitespace title",
          } satisfies ITodoTodo.ICreate,
        });
      },
    );
  }
}
