import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_retrieval_invalid_todo_id(
  connection: api.IConnection,
) {
  // Create a user account first for authentication
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);

  // Attempt to retrieve a todo with a non-existent UUID
  await TestValidator.error(
    "should fail when retrieving non-existent todo",
    async () => {
      await api.functional.todoApp.user.todos.at(connection, {
        todoId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  TestValidator.predicate(
    "user is authenticated",
    connection.headers?.Authorization !== undefined,
  );
}
