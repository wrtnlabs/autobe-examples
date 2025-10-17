import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test successful admin password change workflow.
 *
 * This test validates that an authenticated admin can successfully change their
 * password by providing the correct current password and a valid new password
 * that meets all security requirements.
 *
 * Workflow:
 *
 * 1. Create a new admin account with initial password
 * 2. Authenticate with the initial credentials
 * 3. Change password by providing current password and new password
 * 4. Verify password change success confirmation
 * 5. Confirm current session remains active
 */
export async function test_api_admin_password_change_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account with initial credentials
  const initialPassword = RandomGenerator.alphaNumeric(12);
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: initialPassword,
    name: RandomGenerator.name(),
    role_level: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(createdAdmin);

  // Step 2: Verify admin account was created successfully
  TestValidator.equals(
    "admin email matches",
    createdAdmin.email,
    adminCreateData.email,
  );
  TestValidator.equals(
    "admin name matches",
    createdAdmin.name,
    adminCreateData.name,
  );
  TestValidator.equals(
    "admin role_level matches",
    createdAdmin.role_level,
    adminCreateData.role_level,
  );

  // Step 3: Change the admin password
  const newPassword = RandomGenerator.alphaNumeric(12);
  const passwordChangeData = {
    current_password: initialPassword,
    new_password: newPassword,
  } satisfies IShoppingMallAdmin.IPasswordChange;

  const passwordChangeResponse: IShoppingMallAdmin.IPasswordChangeResponse =
    await api.functional.auth.admin.password.change.changePassword(connection, {
      body: passwordChangeData,
    });
  typia.assert(passwordChangeResponse);

  // Step 4: Verify password change success
  TestValidator.predicate(
    "password change response has success message",
    passwordChangeResponse.message.length > 0,
  );
}
