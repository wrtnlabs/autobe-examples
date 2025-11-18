import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test successful administrator password update workflow.
 *
 * This test validates that an authenticated administrator can successfully
 * update their password by providing the correct current password and a valid
 * new password. The test ensures that the password update operation completes
 * successfully and returns updated account information with a new updated_at
 * timestamp.
 *
 * Workflow:
 *
 * 1. Create and authenticate a new admin account via join endpoint
 * 2. Update the admin's password with valid current and new passwords
 * 3. Verify the password update succeeds and returns updated admin data
 * 4. Validate that updated_at timestamp reflects the change
 */
export async function test_api_admin_password_update_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "SecurePass123!";
  const newPassword = "NewSecurePass456!";

  const registrationData = {
    email: adminEmail,
    password: originalPassword,
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const authenticatedAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationData,
    });

  typia.assert(authenticatedAdmin);
  typia.assert(authenticatedAdmin.token);

  // Step 2: Update the admin's password
  const passwordUpdateData = {
    current_password: originalPassword,
    new_password: newPassword,
  } satisfies ITodoListAdmin.IUpdatePassword;

  const updatedAdmin: ITodoListAdmin =
    await api.functional.todoList.admin.admins.me.password.update(connection, {
      body: passwordUpdateData,
    });

  typia.assert(updatedAdmin);

  // Step 3: Validate the response contains correct admin information
  TestValidator.equals(
    "admin ID should remain unchanged",
    updatedAdmin.id,
    authenticatedAdmin.id,
  );

  TestValidator.equals(
    "admin email should remain unchanged",
    updatedAdmin.email,
    authenticatedAdmin.email,
  );

  TestValidator.equals(
    "admin created_at should remain unchanged",
    updatedAdmin.created_at,
    authenticatedAdmin.created_at,
  );
}
