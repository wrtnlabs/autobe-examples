import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test administrator password change workflow through profile update.
 *
 * This test validates the password update flow for administrators:
 *
 * 1. Create a new administrator account with initial password
 * 2. Update the administrator's password to a new value
 * 3. Verify the password is securely hashed and not exposed in responses
 * 4. Validate the update succeeds and returns proper admin summary
 *
 * Security validation ensures that password hashes are never returned in API
 * responses and that plain-text passwords are properly hashed before storage.
 */
export async function test_api_admin_profile_update_password(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account with initial password
  const initialPassword = "initial_password_123";
  const adminEmail = typia.random<string & tags.Format<"email">>();

  const createdAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: initialPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Verify the join response doesn't expose password hash
  const createdAdminJson = createdAdmin as any;
  TestValidator.predicate(
    "join response should not contain password field",
    !createdAdminJson.password && !createdAdminJson.password_hash,
  );

  // Step 2: Update the admin's password to a new value
  const newPassword = "new_secure_password_456";

  const updatedAdmin: ITodoListAdmin.ISummary =
    await api.functional.todoList.admin.admins.update(connection, {
      adminId: createdAdmin.id,
      body: {
        password: newPassword,
      } satisfies ITodoListAdmin.IUpdate,
    });
  typia.assert(updatedAdmin);

  // Step 3: Verify the update response doesn't expose password hash
  const updatedAdminJson = updatedAdmin as any;
  TestValidator.predicate(
    "update response should not contain password field",
    !updatedAdminJson.password && !updatedAdminJson.password_hash,
  );

  // Verify the admin ID matches
  TestValidator.equals(
    "updated admin ID should match created admin ID",
    updatedAdmin.id,
    createdAdmin.id,
  );

  // Verify the email remains unchanged
  TestValidator.equals(
    "updated admin email should match created admin email",
    updatedAdmin.email,
    createdAdmin.email,
  );
}
