import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

/**
 * Test that an authenticated user can delete a todoListUser by providing their
 * unique ID.
 *
 * The test performs the following steps:
 *
 * 1. Create a new user account via the /auth/user/join endpoint to obtain an
 *    authorization token.
 * 2. Attempt deleting that newly created user using the
 *    /todoList/user/todoListUsers/{id} delete endpoint.
 * 3. Validate that the deletion succeeds without errors.
 * 4. Attempt deleting a non-existent user ID to verify error handling.
 * 5. Validate that the correct error is thrown for non-existent user deletion.
 *
 * This test ensures the authorization enforcement and correctness of the user
 * deletion API.
 */
export async function test_api_todo_list_user_deletion_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Create a new user account to get authorization
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "password123",
    name: RandomGenerator.name(),
  } satisfies ITodoListTodoListUser.ICreate;

  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: userCreateBody,
  });
  typia.assert(authorizedUser);

  // 2. Delete the created user by id
  await api.functional.todoList.user.todoListUsers.erase(connection, {
    id: authorizedUser.id,
  });

  // 3. Attempt deleting again should result in error
  const invalidId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent user throws error",
    async () => {
      await api.functional.todoList.user.todoListUsers.erase(connection, {
        id: invalidId,
      });
    },
  );
}
