import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test complete admin password change workflow from registration through
 * successful password update.
 *
 * This test validates the administrator's self-service password management
 * capability by:
 *
 * 1. Creating a new admin account with initial password
 * 2. Automatically authenticating after registration
 * 3. Updating the password with current password verification
 * 4. Validating the response contains updated admin profile information
 * 5. Confirming authentication works with the new password
 *
 * The test ensures that password changes follow secure practices including
 * current password verification and that the new password meets all security
 * requirements (minimum 8 characters, uppercase, lowercase, numeric, and
 * special character).
 */
export async function test_api_admin_password_change_success(
  connection: api.IConnection,
) {
  // Step 1: Generate test data for admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "InitialPass123!"; // Meets all security requirements
  const newPassword = "NewSecurePass456#"; // Different password meeting all requirements

  const registrationData = {
    email: adminEmail,
    password: initialPassword,
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  // Step 2: Register new admin account (automatically authenticates)
  const registeredAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate registration response
  typia.assert(registeredAdmin);
  TestValidator.equals(
    "admin email matches",
    registeredAdmin.email,
    adminEmail,
  );

  // Step 4: Capture the initial updated_at timestamp for comparison
  const initialUpdatedAt = registeredAdmin.updated_at;

  // Step 5: Perform password change with current password verification
  const passwordChangeData = {
    current_password: initialPassword,
    new_password: newPassword,
  } satisfies ITodoListAdmin.IUpdate;

  const updatedAdminProfile: ITodoListAdmin.ISummary =
    await api.functional.todoList.admin.admins.me.update(connection, {
      body: passwordChangeData,
    });

  // Step 6: Validate password change response
  typia.assert(updatedAdminProfile);
  TestValidator.equals(
    "admin ID unchanged",
    updatedAdminProfile.id,
    registeredAdmin.id,
  );
  TestValidator.equals(
    "admin email unchanged",
    updatedAdminProfile.email,
    adminEmail,
  );

  // Step 7: Verify updated_at timestamp changed (indicating password was updated)
  TestValidator.predicate(
    "updated_at timestamp changed after password update",
    new Date(updatedAdminProfile.updated_at).getTime() >
      new Date(initialUpdatedAt).getTime(),
  );

  // Step 8: Create new connection for re-authentication test (simulate logout)
  const freshConnection: api.IConnection = { ...connection, headers: {} };

  // Step 9: Verify authentication with new password succeeds
  const reauthData = {
    email: adminEmail,
    password: newPassword,
    ip: "192.168.1.101",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const reauthenticatedAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(freshConnection, {
      body: reauthData,
    });

  // Step 10: Validate re-authentication succeeded
  typia.assert(reauthenticatedAdmin);
  TestValidator.equals(
    "re-authenticated admin ID matches",
    reauthenticatedAdmin.id,
    registeredAdmin.id,
  );
  TestValidator.equals(
    "re-authenticated admin email matches",
    reauthenticatedAdmin.email,
    adminEmail,
  );
}
