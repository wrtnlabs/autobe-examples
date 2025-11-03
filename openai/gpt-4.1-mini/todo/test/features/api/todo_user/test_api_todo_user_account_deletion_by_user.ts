import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * This test function validates the complete workflow of a todo user account
 * deletion by the authorized user.
 *
 * The test process includes:
 *
 * 1. Register a new user via /auth/user/join to obtain authorized user
 *    credentials.
 * 2. Create a todo user account with /todo/todoUsers POST, using the new user's
 *    email and password.
 * 3. Perform a DELETE request on /todo/user/todoUsers/{todoUserEmail} to delete
 *    the user account.
 * 4. Confirm the deletion by verifying the DELETE API returns null and that
 *    associated data is removed.
 *
 * Each step includes type-safe data generation, response validation with
 * typia.assert, and assertion checks with TestValidator.
 */
export async function test_api_todo_user_account_deletion_by_user(
  connection: api.IConnection,
) {
  // Step 1: User registration to authenticate
  const userCreateBody = {
    email: RandomGenerator.pick([
      "alpha@example.com",
      "beta@example.com",
      "gamma@example.com",
      "delta@example.com",
    ]) as string & tags.Format<"email">,
    password: "SecurePass123!",
  } satisfies ITodoUser.ICreate;

  const authorizedUser: ITodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // Step 2: Create todo user account
  const todoUserCreateBody = {
    email: userCreateBody.email,
    password: userCreateBody.password,
  } satisfies ITodoUser.ICreate;

  const todoUser: ITodoUser = await api.functional.todo.todoUsers.create(
    connection,
    {
      body: todoUserCreateBody,
    },
  );
  typia.assert(todoUser);

  // Step 3: Delete the todo user account
  // Use the exact email of the user created above as the path parameter
  const deleteResult = await api.functional.todo.user.todoUsers.erase(
    connection,
    {
      todoUserEmail: todoUser.email,
    },
  );
  // The DELETE API returns void with empty body, so no typia.assert needed

  // Step 4: Verify deletion succeeded by checking that a subsequent deletion or retrieval fails
  // Since retrieval API isn't provided, attempt to delete again to ensure the user no longer exists
  await TestValidator.error(
    "Deleting already deleted user should throw error",
    async () => {
      await api.functional.todo.user.todoUsers.erase(connection, {
        todoUserEmail: todoUser.email,
      });
    },
  );
}
