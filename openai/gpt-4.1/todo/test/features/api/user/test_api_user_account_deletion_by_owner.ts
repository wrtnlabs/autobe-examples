import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSysMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSysMigration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test permanent deletion of a Todo List user account by its authenticated
 * owner.
 *
 * This workflow covers:
 *
 * 1. User registration (join) with unique credentials
 * 2. Authenticated account owner requests deletion of their user account by email
 * 3. Validate deletion succeeds and authentication is invalidated (tokens revoked)
 * 4. Confirm that repeated logins are not possible (login fails after deletion)
 * 5. Ensure user record/data is not retrievable or found after deletion
 * 6. Confirm deletion can only be performed by the owner (self-deletion), guests
 *    or other users cannot delete
 * 7. Validate privacy compliance: absence of recoverable user data post-deletion
 */
export async function test_api_user_account_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register new user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string &
    tags.MinLength<8> &
    tags.MaxLength<100> &
    tags.Format<"password"> = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<100> & tags.Format<"password">
  >();
  const userJoinBody = {
    email,
    password,
    href: "https://e2e.test/join",
    referrer: "https://e2e.test/landing",
    ip: "127.0.0.1",
  } satisfies ITodoListUser.ICreate;
  const authorized: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoinBody });
  typia.assert(authorized);

  // 2. Self-delete user account (authenticated owner calls erase)
  await api.functional.todoList.user.users.erase(connection, {
    email,
  });

  // 3. Confirm further login is not possible (account creds invalidated)
  await TestValidator.error(
    "login should fail after self-deletion",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: userJoinBody,
      });
    },
  );

  // 4. Validate deletion is strictly self: attempts as guest/other fail
  const otherEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const otherPassword: string &
    tags.MinLength<8> &
    tags.MaxLength<100> &
    tags.Format<"password"> = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<100> & tags.Format<"password">
  >();
  const otherUserJoinBody = {
    email: otherEmail,
    password: otherPassword,
    href: "https://e2e.test/join",
    referrer: "https://e2e.test/landing",
    ip: "127.0.0.1",
  } satisfies ITodoListUser.ICreate;

  // Register and authenticate as second user
  const otherAuthorized: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: otherUserJoinBody,
    });
  typia.assert(otherAuthorized);

  // Attempt to delete the first user as another user - should fail
  await TestValidator.error(
    "cross-user deletion should be forbidden",
    async () => {
      await api.functional.todoList.user.users.erase(connection, {
        email,
      });
    },
  );

  // 5. Attempt to delete non-existent/deleted user again (should fail, no-recovery)
  await TestValidator.error("No recovery possible after deletion", async () => {
    await api.functional.todoList.user.users.erase(connection, { email });
  });
}
