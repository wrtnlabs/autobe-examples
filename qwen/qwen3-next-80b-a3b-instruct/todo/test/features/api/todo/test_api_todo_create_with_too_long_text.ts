import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_create_with_too_long_text(
  connection: api.IConnection,
) {
  // 1. Create authenticated user context
  const email = typia.random<string & tags.Format<"email">>();
  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password: "password123",
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);

  // 2. Attempt to create todo with 300-character text (exceeding 255 limit)
  const tooLongText = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 10,
    wordMax: 15,
  }); // This will generate ~300+ characters

  await TestValidator.error(
    "should reject todo with text exceeding 255 character limit",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: {
          text: tooLongText,
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );
}
