import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test deletion attempt for a user account that does not exist.
 *
 * This test validates that the system correctly handles attempts to delete a
 * user that does not exist in the database. It ensures proper business error
 * handling with no unintended success or side-effects.
 *
 * Business context: Only account owners or privileged actors can delete
 * accounts, which are hard-deleted without soft deletion. Deleting a
 * nonexistent account should be safely rejected, confirming robust protection
 * against unauthorized or invalid delete operations.
 *
 * Steps:
 *
 * 1. Register a valid user (as control and to establish a valid actor and issuer
 *    token for authorization).
 * 2. Attempt to delete a different user (using a freshly generated UUID that does
 *    not exist in the system).
 * 3. Expect an error; confirm that deletion cannot proceed for non-existent
 *    account.
 */
export async function test_api_user_delete_nonexistent_account_failure(
  connection: api.IConnection,
) {
  // 1. Register a valid user to establish authentication context
  const registration = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      display_name: RandomGenerator.name(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registration);

  // 2. Attempt to delete a non-existent user (random UUID, different from the registered user)
  let nonExistentUserId: string & tags.Format<"uuid">;
  do {
    nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  } while (nonExistentUserId === registration.id);

  await TestValidator.error(
    "attempting to delete a user that does not exist fails with business error",
    async () => {
      await api.functional.todoList.user.users.erase(connection, {
        userId: nonExistentUserId,
      });
    },
  );
}
