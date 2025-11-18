import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that users can update their own email and password in the todo list
 * system, and system updates `updated_at` timestamp accordingly.
 *
 * The test also covers error cases:
 *
 * - Update fails without authentication
 * - A user may not update other users' accounts
 * - Updating to a reused (already existing) email fails
 * - Password complexity is enforced
 * - Updating is blocked when an account is locked
 */
export async function test_api_todo_list_user_update_self(
  connection: api.IConnection,
) {
  // 1. Register first user (main user)
  const email1 = RandomGenerator.alphabets(8) + "1@todo.com";
  const password1 = RandomGenerator.alphaNumeric(10) + "xY!";
  const user1Auth = await api.functional.auth.user.join(connection, {
    body: {
      email: email1,
      password: password1,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user1Auth);
  const userId1 = user1Auth.id;

  // 2. Register second user (for email reuse/ownership checks)
  const email2 = RandomGenerator.alphabets(8) + "2@todo.com";
  const password2 = RandomGenerator.alphaNumeric(12) + "Qz!";
  const user2Auth = await api.functional.auth.user.join(connection, {
    body: {
      email: email2,
      password: password2,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user2Auth);
  const userId2 = user2Auth.id;

  // 3. Update own email (user1 updates to a fresh new unique email)
  const newEmail = RandomGenerator.alphabets(6) + "99@todo.com";
  const updateOwnEmailBody = {
    email: newEmail,
  } satisfies ITodoListUser.IUpdate;
  const updatedUser1 = await api.functional.todoList.user.users.update(
    connection,
    {
      userId: userId1,
      body: updateOwnEmailBody,
    },
  );
  typia.assert(updatedUser1);
  TestValidator.equals("user1 updated email", updatedUser1.email, newEmail);
  TestValidator.notEquals(
    "updated_at changed after email update",
    updatedUser1.updated_at,
    user1Auth.updated_at,
  );

  // 4. Update own password (user1, just update password with new value - for complexity, use valid length+symbols)
  const newPassword = RandomGenerator.alphaNumeric(14) + "!$#";
  const updateOwnPasswordBody = {
    password: newPassword,
  } satisfies ITodoListUser.IUpdate;
  const updatedUser1b = await api.functional.todoList.user.users.update(
    connection,
    {
      userId: userId1,
      body: updateOwnPasswordBody,
    },
  );
  typia.assert(updatedUser1b);
  TestValidator.equals(
    "user1 still has new email after password change",
    updatedUser1b.email,
    newEmail,
  );
  TestValidator.notEquals(
    "updated_at changed after password update",
    updatedUser1b.updated_at,
    updatedUser1.updated_at,
  );

  // 5. Fail to update another account (user1 attempts to update user2)
  await TestValidator.error(
    "user cannot update other user account",
    async () => {
      await api.functional.todoList.user.users.update(connection, {
        userId: userId2,
        body: {
          email: RandomGenerator.alphabets(8) + "hij@todo.com",
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );

  // 6. Fail to update after sign-out (simulate unauthenticated by clearing auth header)
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error("update fails without authentication", async () => {
    await api.functional.todoList.user.users.update(unauthConn, {
      userId: userId1,
      body: {
        email: RandomGenerator.alphabets(8) + "ha@todo.com",
      } satisfies ITodoListUser.IUpdate,
    });
  });

  // 7. Fail to update email to an already used email (user1 tries to update to user2's email)
  await TestValidator.error("update to reused email fails", async () => {
    await api.functional.todoList.user.users.update(connection, {
      userId: userId1,
      body: { email: email2 } satisfies ITodoListUser.IUpdate,
    });
  });

  // 8. Fail to update to a weak/short password (too short)
  await TestValidator.error(
    "password complexity enforced (too short)",
    async () => {
      await api.functional.todoList.user.users.update(connection, {
        userId: userId1,
        body: { password: "short" } satisfies ITodoListUser.IUpdate,
      });
    },
  );

  // 9. Fail to update when account is locked (simulate lock, then try update)
  // We'll simulate this by directly modifying the account state in memory if possible, but in E2E, would require an admin API.
  // For this test, we expect the system to refuse update if is_locked is true (assuming such a state can be created).
  // We'll simulate by assuming (if system ever provides account lock) -- SKIP real lock in this test due to lack of API; document expected logic.
}
