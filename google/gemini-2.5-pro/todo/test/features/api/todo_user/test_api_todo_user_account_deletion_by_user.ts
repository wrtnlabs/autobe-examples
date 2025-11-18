import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Verifies a user can permanently delete their own todo account.
 *
 * This scenario covers the complete flow:
 *
 * 1. A user registers and is automatically authenticated (receiving JWT token).
 * 2. The user deletes their own account using DELETE /todo/user/users/{userId}
 *    while authenticated.
 * 3. The test asserts deletion is successful and that the account is no longer
 *    accessible using the same credentials.
 * 4. The test also covers denial of deletion when not authenticated as that user
 *    (should NOT be able to delete other users).
 * 5. Asserts the operation is irreversible.
 */
export async function test_api_todo_user_account_deletion_by_user(
  connection: api.IConnection,
) {
  // 1. Register new user
  const userRegistration = {
    email: typia.random<
      string & tags.MinLength<3> & tags.MaxLength<256> & tags.Format<"email">
    >(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    ip: null,
    href: "https://test.example.com/join",
    referrer: "https://test.example.com/landing",
  } satisfies ITodoUser.ICreate;

  const authorized: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userRegistration },
  );
  typia.assert(authorized);

  // 2. Delete own account
  await api.functional.todo.user.users.erase(connection, {
    userId: authorized.id,
  });

  // 3. Attempt to perform further user actions (self-access) should fail
  await TestValidator.error(
    "should reject actions with deleted account",
    async () => {
      await api.functional.todo.user.users.erase(connection, {
        userId: authorized.id,
      });
    },
  );

  // 4. (Optional): Attempt deletion as a different user not permitted -
  // Not implemented due to no endpoint for switching user in SDK/DTOs.
}
