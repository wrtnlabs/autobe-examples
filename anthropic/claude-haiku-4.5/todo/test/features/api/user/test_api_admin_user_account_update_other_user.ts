import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that an authenticated admin can update any user account in the system.
 *
 * This test validates the admin's capability to modify user accounts. The
 * workflow includes:
 *
 * 1. Admin registration to establish administrative access
 * 2. Regular user registration to create a target account for modification
 * 3. Admin updates the user's email address to a new valid email
 * 4. Admin changes the user's account status from active to inactive
 * 5. Verification that the changes are persisted correctly
 *
 * This ensures admins have proper authority to manage user accounts while
 * maintaining authorization and data integrity.
 */
export async function test_api_admin_user_account_update_other_user(
  connection: api.IConnection,
) {
  // Step 1: Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminData = {
    email: adminEmail,
    password: adminPassword,
    password_confirmation: adminPassword,
  } satisfies ITodoAppAdmin.IRegister;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminData,
    },
  );
  typia.assert(admin);
  TestValidator.equals("admin email matches input", admin.email, adminEmail);
  TestValidator.equals("admin status is active", admin.status, "active");

  // Step 2: Regular user registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(12);
  const userData = {
    email: userEmail,
    password: userPassword,
  } satisfies ITodoAppUser.IJoin;

  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: userData,
    },
  );
  typia.assert(user);
  TestValidator.equals("user email matches input", user.email, userEmail);
  TestValidator.equals("user initial status is active", user.status, "active");

  // Step 3 & 4: Admin updates user's email and status
  const newUserEmail = typia.random<string & tags.Format<"email">>();
  const updateUserData = {
    email: newUserEmail,
    status: "inactive",
  } satisfies ITodoAppUser.IUpdate;

  const updatedUser: ITodoAppUser =
    await api.functional.todoApp.admin.users.update(connection, {
      userId: user.id,
      body: updateUserData,
    });
  typia.assert(updatedUser);

  // Step 5: Verify changes are persisted correctly
  TestValidator.equals(
    "user email updated by admin",
    updatedUser.email,
    newUserEmail,
  );
  TestValidator.equals(
    "user status changed to inactive by admin",
    updatedUser.status,
    "inactive",
  );
  TestValidator.equals("user id remains unchanged", updatedUser.id, user.id);
  TestValidator.notEquals(
    "updated_at timestamp reflects modification",
    updatedUser.updated_at,
    user.updated_at,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedUser.created_at,
    user.created_at,
  );
}
