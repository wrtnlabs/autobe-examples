import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test administrator capability to reset user passwords as part of account
 * recovery workflows.
 *
 * This scenario validates admin password management functionality:
 *
 * 1. Create multiple regular user accounts for testing
 * 2. Create an admin account with password management privileges
 * 3. Admin updates passwords for multiple user accounts
 * 4. Confirm updated_at timestamps are modified for affected accounts
 * 5. Test that minimum password security requirements are enforced
 *
 * This test ensures administrators can effectively manage password resets while
 * maintaining security standards.
 */
export async function test_api_admin_user_management_batch_password_reset(
  connection: api.IConnection,
) {
  // Step 1: Create multiple regular user accounts
  const userCount = 3;
  const users: ITodoListUser.IAuthorized[] = await ArrayUtil.asyncRepeat(
    userCount,
    async (index) => {
      const userEmail = typia.random<string & tags.Format<"email">>();
      const userPassword = typia.random<string & tags.MinLength<8>>();

      const user = await api.functional.auth.user.join(connection, {
        body: {
          email: userEmail,
          password: userPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoListUser.ICreate,
      });

      typia.assert(user);
      return user;
    },
  );

  // Step 2: Create an admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });

  typia.assert(admin);

  // Step 3: Admin updates passwords for multiple user accounts
  const newPasswords: string[] = [];
  const updatedUsers: ITodoListUser[] = await ArrayUtil.asyncRepeat(
    userCount,
    async (index) => {
      const newPassword = typia.random<string & tags.MinLength<8>>();
      newPasswords.push(newPassword);

      const updatedUser = await api.functional.todoList.admin.users.update(
        connection,
        {
          userId: users[index].id,
          body: {
            password: newPassword,
          } satisfies ITodoListUser.IUpdate,
        },
      );

      typia.assert(updatedUser);
      return updatedUser;
    },
  );

  // Step 4: Confirm updated_at timestamps are modified
  for (let i = 0; i < userCount; i++) {
    TestValidator.predicate(
      "updated_at timestamp should be modified after password change",
      new Date(updatedUsers[i].updated_at).getTime() >
        new Date(users[i].updated_at).getTime(),
    );
  }

  // Step 5: Test minimum password security requirements are enforced
  await TestValidator.error(
    "password must meet minimum length requirement of 8 characters",
    async () => {
      await api.functional.todoList.admin.users.update(connection, {
        userId: users[0].id,
        body: {
          password: "short",
        } satisfies ITodoListUser.IUpdate,
      });
    },
  );
}
