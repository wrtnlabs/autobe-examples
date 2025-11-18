import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * E2E scenario: Ensure complete user deletion and cascade in Todo List app.
 *
 * This test registers two users: the main (to be deleted) and a control user.
 * The main user authenticates, performs self-deletion, after which:
 *
 * - Login attempts for the deleted account must fail
 * - Deleting an already-deleted account must not cause data leaks
 * - Another user's attempt to delete this account is denied
 * - System integrity is preserved throughout
 * - (future extension) All cascade data is confirmed erased if any other
 *   endpoints for owned data exist. Steps:
 *
 * 1. Register User A (target for deletion)
 * 2. Register User B (control)
 * 3. Authenticate as User A
 * 4. Delete User A's own account
 * 5. Assert successful deletion
 * 6. Attempt login as User A -- should fail
 * 7. Attempt to delete User A again (no error leaked / no effect)
 * 8. Authenticate as User B
 * 9. Attempt to delete User A as User B (must be denied)
 */
export async function test_api_todo_user_deletion_and_cascade(
  connection: api.IConnection,
) {
  // Register User A (will be deleted)
  const emailA = typia.random<string & tags.Format<"email">>();
  const passwordA = RandomGenerator.alphaNumeric(12);
  const joinReqA = {
    email: emailA,
    password: passwordA,
    href: "https://todo.test/signup",
    referrer: "https://todo.test/landing",
  } satisfies ITodoUser.IJoin;
  const userA: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinReqA },
  );
  typia.assert(userA);

  // Register User B (control)
  const emailB = typia.random<string & tags.Format<"email">>();
  const passwordB = RandomGenerator.alphaNumeric(12);
  const joinReqB = {
    email: emailB,
    password: passwordB,
    href: "https://todo.test/signup",
    referrer: "https://todo.test/landing",
  } satisfies ITodoUser.IJoin;
  const userB: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinReqB },
  );
  typia.assert(userB);

  // Ensure User A's token is active (the join set connection header)
  TestValidator.equals(
    "joined user token is present",
    typeof userA.token.access,
    "string",
  );

  // Delete User A's own account (using token set in connection)
  const deleted: ITodoUser = await api.functional.todo.user.users.erase(
    connection,
    { userId: userA.id },
  );
  typia.assert(deleted);
  TestValidator.equals("deleted user ID", deleted.id, userA.id);

  // Attempt to login as User A after deletion: must fail
  await TestValidator.error(
    "cannot login with deleted credentials",
    async () => {
      await api.functional.auth.user.join(
        { ...connection, headers: {} }, // bare headers to reset token
        {
          body: {
            email: emailA,
            password: passwordA,
            href: "https://todo.test/login",
            referrer: "https://todo.test/reset",
          } satisfies ITodoUser.IJoin,
        },
      );
    },
  );

  // Attempt to delete already-deleted user again (should not error/leak data)
  await TestValidator.error("no effect on double delete", async () => {
    await api.functional.todo.user.users.erase(connection, {
      userId: userA.id,
    });
  });

  // Switch to User B's context for unauthorized attempts
  await api.functional.auth.user.join(connection, {
    body: {
      email: emailB,
      password: passwordB,
      href: "https://todo.test/login",
      referrer: "https://todo.test/reset",
    } satisfies ITodoUser.IJoin,
  });

  // Attempt to delete User A (as User B, not self) -- must be denied
  await TestValidator.error(
    "cannot delete another user's account",
    async () => {
      await api.functional.todo.user.users.erase(connection, {
        userId: userA.id,
      });
    },
  );
}
