import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_account_update_nonexistent_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const createUserBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ITodoListUser.ICreate;

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: createUserBody,
    });
  typia.assert(createdUser);

  // Step 2: Permanently delete the created user account
  await api.functional.todoList.user.todo_list_users.erase(connection, {
    userId: createdUser.id,
  });

  // Step 3: Attempt to update the non-existent user account
  // This should return 404 Not Found error
  await TestValidator.error(
    "updating non-existent user account should fail with 404",
    async () => {
      await api.functional.todoList.user.todo_list_users.update(connection, {
        userId: createdUser.id,
        body: {
          email: "updated@example.com",
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );
}
