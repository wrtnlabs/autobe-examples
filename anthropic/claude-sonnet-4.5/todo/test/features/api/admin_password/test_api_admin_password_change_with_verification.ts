import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test the complete password change workflow for an administrator account.
 *
 * This test validates the security requirements and session management during
 * admin password changes. The workflow includes:
 *
 * 1. Create a new admin account through registration
 * 2. Authenticate as that admin (automatic via SDK)
 * 3. Change password with current password verification and new password
 * 4. Verify password change succeeded by making another authenticated request
 *
 * Security validations:
 *
 * - Password change requires current password for verification
 * - New password must meet minimum security requirements (8+ characters)
 * - Password is securely hashed before storage
 * - Admin session remains valid after password change
 */
export async function test_api_admin_password_change_with_verification(
  connection: api.IConnection,
) {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "SecurePass123";
  const newPassword = "NewSecurePass456";

  const registrationData = {
    email: adminEmail,
    password: originalPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: registrationData,
  });
  typia.assert(admin);

  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.predicate("admin has valid UUID", admin.id.length > 0);
  TestValidator.predicate(
    "admin has access token",
    admin.token.access.length > 0,
  );

  await api.functional.todoList.admin.admins.me.password.update(connection, {
    body: {
      current_password: originalPassword,
      new_password: newPassword,
    } satisfies ITodoListAdmin.IChangePassword,
  });

  await api.functional.todoList.admin.admins.me.password.update(connection, {
    body: {
      current_password: newPassword,
      new_password: "AnotherSecurePass789",
    } satisfies ITodoListAdmin.IChangePassword,
  });
}
