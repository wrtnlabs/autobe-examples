import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_delete_invalid_uuid_format_rejected(
  connection: api.IConnection,
) {
  // 1. Authenticate a new user
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

  // 2. Create a valid todo item
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        text: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todo);

  // 3. Attempt to delete with invalid UUID format - 32 characters instead of 36
  const invalidUuid = RandomGenerator.alphaNumeric(32); // Invalid format - not 36 chars

  // 4. Verify that the API returns 400 Bad Request error for malformed UUID
  await TestValidator.httpError(
    "API should reject invalid UUID format (32 characters) with 400 Bad Request",
    400,
    async () => {
      await api.functional.todoList.user.todos.erase(connection, {
        todoId: invalidUuid,
      });
    },
  );
}
