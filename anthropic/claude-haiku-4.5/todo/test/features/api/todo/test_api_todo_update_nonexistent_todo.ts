import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test updating a non-existent todo item.
 *
 * This test validates that the API properly handles update requests for todo
 * items that do not exist. The test creates an authenticated user account, then
 * attempts to update a todo using a randomly generated UUID that was never
 * created.
 *
 * The test verifies that:
 *
 * 1. User authentication is successful
 * 2. Attempting to update a non-existent todo returns an error response
 * 3. The system properly rejects the operation on non-existent resources
 */
export async function test_api_todo_update_nonexistent_todo(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Attempt to update a non-existent todo
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "updating non-existent todo should fail",
    async () => {
      await api.functional.todoApp.user.todos.update(connection, {
        todoId: nonExistentTodoId,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
}
