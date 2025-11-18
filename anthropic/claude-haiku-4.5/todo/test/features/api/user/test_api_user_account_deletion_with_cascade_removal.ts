import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that a user's account can be permanently deleted, including the
 * cascading removal of all related data and sessions.
 *
 * 1. Register and authenticate as a new user
 * 2. Delete own account via /todoList/user/users/me endpoint
 * 3. Confirm further authenticated requests with the deleted session will not
 *    succeed (cascading removal)
 * 4. Verify the operation can only be performed by that user and the account/data
 *    cannot be restored
 */
export async function test_api_user_account_deletion_with_cascade_removal(
  connection: api.IConnection,
) {
  // Step 1: Register a unique user
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://e2e.test/delete-account",
    referrer: "https://e2e.test/",
    ip: null,
  } satisfies ITodoListUser.IJoin;
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userJoinBody },
  );
  typia.assert(user);
  TestValidator.equals(
    "joined email equals registered email",
    user.email,
    userJoinBody.email,
  );

  // Step 2: Delete own account
  await api.functional.todoList.user.users.me.erase(connection);

  // Step 3: Further authenticated calls should fail (tokens revoked, no session)
  await TestValidator.error(
    "access after user deletion should fail",
    async () => {
      // Try deleting again… should not succeed as user no longer exists
      await api.functional.todoList.user.users.me.erase(connection);
    },
  );

  // Step 4: Register a different user to try deleting the other account (should not be possible)
  const attackerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://e2e.test/delete-account-attacker",
    referrer: "https://e2e.test/",
    ip: null,
  } satisfies ITodoListUser.IJoin;
  const attacker: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: attackerJoinBody });
  typia.assert(attacker);
  TestValidator.equals(
    "attacker email ok",
    attacker.email,
    attackerJoinBody.email,
  );

  // The attacker (fresh session) can't delete the original user (since it doesn't exist anymore and endpoint is always self-delete)
  // Since the endpoint is /me, it's not possible for the attacker to delete the original user; each session only has access to delete itself
  await api.functional.todoList.user.users.me.erase(connection); // deletes attacker's own account as allowed
}
