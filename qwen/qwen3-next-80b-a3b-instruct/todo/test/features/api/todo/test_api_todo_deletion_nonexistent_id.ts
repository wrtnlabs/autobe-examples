import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_deletion_nonexistent_id(
  connection: api.IConnection,
) {
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  await TestValidator.httpError(
    "non-existent todo deletion should return 404",
    404,
    async () => {
      await api.functional.todoApp.user.todos.erase(connection, {
        todoId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
