import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful self-deletion of a user account.
 *
 * This scenario validates the workflow for a user deleting their own account:
 *
 * 1. Register a new user via /auth/user/join, obtaining the authenticated session
 *    context and user id.
 * 2. Use the session to call DELETE /todoList/user/users/{userId} on the same
 *    account.
 * 3. Confirm that the deletion endpoint succeeds without error.
 * 4. Optionally, attempt to retrieve or interact with the deleted user account to
 *    confirm it no longer exists (e.g., checking for expected error response).
 *
 * Prerequisites: The registration (join) endpoint must set authentication as
 * required for subsequent self-delete.
 */
export async function test_api_user_account_delete_self(
  connection: api.IConnection,
) {
  // 1. Register a new user (self-registration, sets authentication)
  const input = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://app.todo-list/register",
    referrer: "https://app.todo-list/landing",
  } satisfies ITodoListUser.ICreate;
  const authorized: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: input });
  typia.assert(authorized);

  // 2. Delete the same user account as authenticated user
  await api.functional.todoList.user.users.erase(connection, {
    userId: authorized.id,
  });

  // 3. Attempt to delete again should fail (already deleted)
  await TestValidator.error(
    "deleting already deleted user should fail",
    async () => {
      await api.functional.todoList.user.users.erase(connection, {
        userId: authorized.id,
      });
    },
  );
}
