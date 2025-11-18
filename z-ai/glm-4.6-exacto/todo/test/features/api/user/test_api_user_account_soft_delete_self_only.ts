import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validate that an authenticated user may perform a soft-delete (account
 * erasure) on their own profile.
 *
 * Steps:
 *
 * 1. Register a user account using a unique email & password (join endpoint)
 * 2. Create a todo as a logged-in user to establish account usage
 * 3. Delete the user's own account using the erase endpoint for soft-delete
 * 4. Validate that deleted_at timestamp is set on the user entity
 * 5. Validate that further login attempts with the same credentials fail
 * 6. If possible, check audit fields or attempt to retrieve the user, ensuring the
 *    deleted record exists and is flagged as deleted
 */
export async function test_api_user_account_soft_delete_self_only(
  connection: api.IConnection,
) {
  // 1. Register a user via join endpoint
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const joinInput = {
    email: userEmail,
    password: userPassword,
    href: "https://test-app.com/register",
    referrer: "https://test-app.com/landing",
    ip: null,
  } satisfies ITodoAppUser.IJoin;
  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(authorizedUser);

  // 2. Create a todo for the authenticated user (validate usage)
  const todoInput = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    due_date: null,
  } satisfies ITodoAppTodo.ICreate;
  const createdTodo = await api.functional.todoApp.user.todos.create(
    connection,
    { body: todoInput },
  );
  typia.assert(createdTodo);
  TestValidator.equals(
    "todo owner is the active user",
    createdTodo.todo_app_user_id,
    authorizedUser.id,
  );

  // 3. Soft-delete (erase) the user's own account
  const erasedUser = await api.functional.todoApp.user.users.erase(connection, {
    userId: authorizedUser.id,
  });
  typia.assert(erasedUser);
  TestValidator.equals(
    "deleted_at is set after soft-delete",
    erasedUser.deleted_at !== null && erasedUser.deleted_at !== undefined,
    true,
  );

  // 4. Attempt login again with same credentials (should fail)
  await TestValidator.error(
    "cannot login after account is soft-deleted",
    async () => {
      await api.functional.auth.user.join(connection, { body: joinInput });
    },
  );
}
