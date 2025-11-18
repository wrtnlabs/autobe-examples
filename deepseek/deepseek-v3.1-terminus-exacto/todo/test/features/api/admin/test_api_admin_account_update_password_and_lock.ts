import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate admin password change and lock status enforcement.
 *
 * 1. Register a new admin and get credentials
 * 2. Update the admin's password to a random strong value and lock the account
 *    (locked: true)
 * 3. Validate the response reflects locked status and that updated_at has changed
 * 4. Attempt to login with the old password – must fail (locked account)
 * 5. Attempt to login with the new password – must fail (locked account)
 * 6. Ensure admin email and role are unchanged, updated_at has changed, and locked
 *    is true
 */
export async function test_api_admin_account_update_password_and_lock(
  connection: api.IConnection,
) {
  // 1. Register admin and get credentials
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16), // strong random password
  } satisfies ITodoListAdmin.IJoin;
  const initialAuth: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(initialAuth);
  const adminId = initialAuth.id;
  const adminEmail = initialAuth.email;
  const oldPassword = joinBody.password;
  const origUpdatedAt = initialAuth.updated_at;
  const origRole = initialAuth.role;

  // 2. Change password and lock the admin account
  const newPassword = RandomGenerator.alphaNumeric(20); // even stronger
  const updateBody = {
    password: newPassword,
    locked: true,
  } satisfies ITodoListAdmin.IUpdate;

  const updated: ITodoListAdmin =
    await api.functional.todoList.admin.admins.update(connection, {
      adminId,
      body: updateBody,
    });
  typia.assert(updated);

  // 3. Validate locked status and updated_at
  TestValidator.equals("admin id remains the same", updated.id, adminId);
  TestValidator.equals("admin email unchanged", updated.email, adminEmail);
  TestValidator.equals("admin role unchanged", updated.role, origRole);
  TestValidator.equals("locked is true", updated.locked, true);
  TestValidator.notEquals(
    "updated_at should change after update",
    updated.updated_at,
    origUpdatedAt,
  );

  // 4. Check that subsequent logins are blocked regardless of password
  // Attempt login with old password
  await TestValidator.error(
    "cannot login with old password when locked",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: adminEmail,
          password: oldPassword,
        } satisfies ITodoListAdmin.IJoin,
      });
    },
  );
  // Attempt login with new password
  await TestValidator.error(
    "cannot login with new password when locked",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: adminEmail,
          password: newPassword,
        } satisfies ITodoListAdmin.IJoin,
      });
    },
  );
}
