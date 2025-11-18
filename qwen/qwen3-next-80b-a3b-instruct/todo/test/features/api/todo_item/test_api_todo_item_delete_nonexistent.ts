import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_todo_item_delete_nonexistent(
  connection: api.IConnection,
) {
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should return 404 for non-existent todo item",
    async () => {
      await api.functional.todoList.user.todoItems.erase(connection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
