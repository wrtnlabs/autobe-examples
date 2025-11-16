import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_create_with_empty_text(
  connection: api.IConnection,
) {
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Test with empty string
  await TestValidator.error("empty todo text should fail", async () => {
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        text: "",
      } satisfies ITodoListTodo.ICreate,
    });
  });

  // Test with whitespace-only string using generated whitespace
  await TestValidator.error(
    "whitespace-only todo text should fail",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: {
          text: ArrayUtil.repeat(5, () => " ").join(""),
        } satisfies ITodoListTodo.ICreate,
      });
    },
  );
}
