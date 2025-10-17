import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_todo_delete_nonexistent_returns_not_found(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePass123!@";

  const authorizedUser = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    },
  );
  typia.assert(authorizedUser);
  TestValidator.predicate(
    "user authentication successful",
    !!authorizedUser.id,
  );

  // Step 2: Attempt to delete a non-existent todo with random UUID
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.httpError(
    "deleting non-existent todo should return 404 error",
    404,
    async () => {
      await api.functional.todoApp.authenticatedUser.todos.erase(connection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
