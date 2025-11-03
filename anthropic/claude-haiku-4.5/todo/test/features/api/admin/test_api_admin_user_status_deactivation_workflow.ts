import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test admin workflow for deactivating user accounts.
 *
 * This comprehensive test validates the complete user account deactivation
 * process:
 *
 * 1. Admin Registration: Admin account is created to manage user accounts
 * 2. User Registration: Regular user account is created with initial 'active'
 *    status
 * 3. Account Status Verification: Confirm user is initially active
 * 4. User Deactivation: Admin updates the user's status to 'inactive' through the
 *    admin endpoint
 * 5. Deactivation Verification: Confirm the user's status changed to 'inactive'
 * 6. Account Data Preservation: Confirm that user data is preserved after
 *    deactivation
 *
 * Step-by-step process:
 *
 * 1. Create admin account with email and password
 * 2. Create regular user account and verify it is active
 * 3. Use admin credentials to update user status to inactive
 * 4. Retrieve updated user to confirm status change to inactive
 * 5. Verify user data remains intact after deactivation
 * 6. Confirm account status controls access by validating status field
 */
export async function test_api_admin_user_status_deactivation_workflow(
  connection: api.IConnection,
) {
  // Step 1: Admin Registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        password_confirmation: adminPassword,
      } satisfies ITodoAppAdmin.IRegister,
    },
  );
  typia.assert(admin);
  TestValidator.equals(
    "admin account created with active status",
    admin.status,
    "active",
  );
  TestValidator.equals("admin email matches input", admin.email, adminEmail);

  // Step 2: User Registration - Create user account with initial active status
  const userConnection: api.IConnection = { ...connection, headers: {} };
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    userConnection,
    {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);
  const userId = user.id;
  TestValidator.equals(
    "user account created with active status",
    user.status,
    "active",
  );
  TestValidator.equals("user email matches input", user.email, userEmail);

  // Step 3: Account Status Verification - Confirm user is initially active
  TestValidator.predicate(
    "user status is active after registration",
    user.status === "active",
  );

  // Step 4: User Deactivation - Admin updates user status to inactive
  const deactivatedUser: ITodoAppUser =
    await api.functional.todoApp.admin.users.update(connection, {
      userId: userId,
      body: {
        status: "inactive",
      } satisfies ITodoAppUser.IUpdate,
    });
  typia.assert(deactivatedUser);
  TestValidator.equals(
    "user status changed to inactive",
    deactivatedUser.status,
    "inactive",
  );

  // Step 5: Deactivation Verification - Confirm status change persisted
  TestValidator.predicate(
    "deactivation is verified",
    deactivatedUser.status === "inactive",
  );
  TestValidator.equals(
    "user ID unchanged after deactivation",
    deactivatedUser.id,
    userId,
  );
  TestValidator.equals(
    "user email unchanged after deactivation",
    deactivatedUser.email,
    userEmail,
  );

  // Step 6: Account Data Preservation - Verify all user data remains intact
  TestValidator.predicate(
    "user has created_at timestamp",
    deactivatedUser.created_at !== null &&
      deactivatedUser.created_at !== undefined,
  );
  TestValidator.predicate(
    "user has updated_at timestamp",
    deactivatedUser.updated_at !== null &&
      deactivatedUser.updated_at !== undefined,
  );
  TestValidator.predicate(
    "status field controls access permissions",
    deactivatedUser.status === "inactive",
  );
}
