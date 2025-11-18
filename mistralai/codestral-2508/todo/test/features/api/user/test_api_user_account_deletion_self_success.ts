import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate permanent user self-deletion for Todo List account.
 *
 * This test covers the registration and hard-deletion lifecycle of a user in
 * the core Todo List service. It ensures:
 *
 * 1. A user can register a new account with unique email and password
 * 2. The registration response returns a valid user ID and token
 * 3. The authenticated user can self-delete their own account via DELETE
 *    /todoList/user/users/{userId}
 * 4. The account is physically removed (no soft deletion): further deletion
 *    attempts on the same userId fail as expected
 * 5. All API type and access constraints are strictly validated
 *
 * Test Procedure:
 *
 * - Generate unique test user credentials (email/password)
 * - Register the user
 * - Validate registration response matches ITodoListUser.IAuthorized
 * - Delete the user by their own userId (authenticated)
 * - Attempt to delete again, asserting failure (as user is hard deleted)
 */
export async function test_api_user_account_deletion_self_success(
  connection: api.IConnection,
) {
  // 1. Register a new user (to be deleted)
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = "https://example.com/signup";
  const referrer = "https://example.com/landing";
  const display_name = RandomGenerator.name(2);
  const registerBody = {
    email,
    password,
    href,
    referrer,
    display_name,
  } satisfies ITodoListUser.ICreate;

  const auth: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: registerBody,
    },
  );
  typia.assert(auth);
  TestValidator.equals("auth email matches input", auth.email, email);
  TestValidator.equals(
    "auth display name matches input",
    auth.display_name,
    display_name,
  );
  TestValidator.equals(
    "auth contains token",
    typeof auth.token.access,
    "string",
  );
  TestValidator.equals("auth contains id", typeof auth.id, "string");

  // 2. Delete the user account (self-deletion; hard-delete)
  await api.functional.todoList.user.users.erase(connection, {
    userId: auth.id,
  });

  // 3. Second delete attempt must fail (already deleted)
  await TestValidator.error(
    "second delete attempt must fail after hard deletion",
    async () => {
      await api.functional.todoList.user.users.erase(connection, {
        userId: auth.id,
      });
    },
  );
}
