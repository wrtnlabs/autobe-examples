import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test admin's capability to update multiple users' account statuses for bulk
 * account management operations.
 *
 * Admin registers and multiple users are created. Admin updates the status of
 * different users to track different account states (active/inactive).
 * Validates that admin can perform independent updates on multiple accounts
 * without affecting each other, each user's status is modified independently,
 * and all changes are properly persisted and logged.
 *
 * Test workflow:
 *
 * 1. Admin registers with unique email and password
 * 2. First user account is created
 * 3. Second user account is created
 * 4. Admin updates first user's status to inactive
 * 5. Admin updates second user's status to inactive
 * 6. Admin updates first user's status back to active
 * 7. Verify status changes are independent and persisted correctly
 */
export async function test_api_admin_bulk_user_status_management(
  connection: api.IConnection,
) {
  // Step 1: Register admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(8);
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
  TestValidator.predicate(
    "admin account created successfully",
    admin.status === "active",
  );

  // Step 2: Create first user account
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Password = RandomGenerator.alphaNumeric(8);
  const user1: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: user1Email,
        password: user1Password,
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user1);
  TestValidator.predicate(
    "first user created with active status",
    user1.status === "active",
  );

  // Step 3: Create second user account
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Password = RandomGenerator.alphaNumeric(8);
  const user2: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: user2Email,
        password: user2Password,
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user2);
  TestValidator.predicate(
    "second user created with active status",
    user2.status === "active",
  );

  // Step 4: Update first user's status to inactive
  const updatedUser1Inactive: ITodoAppUser =
    await api.functional.todoApp.admin.users.update(connection, {
      userId: user1.id,
      body: {
        status: "inactive",
      } satisfies ITodoAppUser.IUpdate,
    });
  typia.assert(updatedUser1Inactive);
  TestValidator.equals(
    "first user status updated to inactive",
    updatedUser1Inactive.status,
    "inactive",
  );

  // Step 5: Update second user's status to inactive
  const updatedUser2Inactive: ITodoAppUser =
    await api.functional.todoApp.admin.users.update(connection, {
      userId: user2.id,
      body: {
        status: "inactive",
      } satisfies ITodoAppUser.IUpdate,
    });
  typia.assert(updatedUser2Inactive);
  TestValidator.equals(
    "second user status updated to inactive",
    updatedUser2Inactive.status,
    "inactive",
  );

  // Step 6: Update first user's status back to active
  const updatedUser1Active: ITodoAppUser =
    await api.functional.todoApp.admin.users.update(connection, {
      userId: user1.id,
      body: {
        status: "active",
      } satisfies ITodoAppUser.IUpdate,
    });
  typia.assert(updatedUser1Active);
  TestValidator.equals(
    "first user status updated back to active",
    updatedUser1Active.status,
    "active",
  );

  // Step 7: Verify first user is active and second user is still inactive
  TestValidator.equals(
    "first user remains active after status change",
    updatedUser1Active.status,
    "active",
  );
  TestValidator.equals(
    "second user remains inactive after independent update",
    updatedUser2Inactive.status,
    "inactive",
  );
  TestValidator.notEquals(
    "user statuses are different after independent updates",
    updatedUser1Active.status,
    updatedUser2Inactive.status,
  );

  // Step 8: Verify user IDs remain consistent
  TestValidator.equals(
    "first user ID unchanged after status updates",
    user1.id,
    updatedUser1Active.id,
  );
  TestValidator.equals(
    "second user ID unchanged after status updates",
    user2.id,
    updatedUser2Inactive.id,
  );
  TestValidator.notEquals(
    "different users have different IDs",
    user1.id,
    user2.id,
  );
}
