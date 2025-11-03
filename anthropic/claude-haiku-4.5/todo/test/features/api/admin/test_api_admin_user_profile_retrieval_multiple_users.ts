import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test admin retrieving profiles of multiple different user accounts.
 *
 * Validates that an admin user can access complete user profile information for
 * any user account in the system. The test creates multiple regular user
 * accounts and verifies that an authenticated admin can retrieve detailed
 * information about each user without access restrictions.
 *
 * This test ensures:
 *
 * 1. Admin authentication is properly established
 * 2. Multiple user accounts can be created successfully
 * 3. Admin permissions allow retrieving any user's profile
 * 4. User profile data is complete and accurate
 * 5. Admin access is consistent across different user retrievals
 * 6. No access restrictions limit admin user queries
 */
export async function test_api_admin_user_profile_retrieval_multiple_users(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with authentication
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
  TestValidator.predicate(
    "admin account created successfully",
    admin.id !== undefined,
  );
  TestValidator.equals("admin email matches input", admin.email, adminEmail);
  TestValidator.equals("admin status is active", admin.status, "active");

  // Step 2: Create multiple regular user accounts
  const userCount = 3;
  const createdUsers: ITodoAppUser[] = [];

  for (let i = 0; i < userCount; i++) {
    const userEmail = typia.random<string & tags.Format<"email">>();
    const userPassword = RandomGenerator.alphabets(10);
    const user: ITodoAppUser = await api.functional.todoApp.users.create(
      connection,
      {
        body: {
          email: userEmail,
          password: userPassword,
        } satisfies ITodoAppUser.ICreate,
      },
    );
    typia.assert(user);
    createdUsers.push(user);
    TestValidator.predicate(
      `user account ${i + 1} created successfully`,
      user.id !== undefined,
    );
  }

  TestValidator.equals(
    "correct number of users created",
    createdUsers.length,
    userCount,
  );

  // Step 3: Admin retrieves each user's profile
  const retrievedUsers: ITodoAppUser[] = [];

  for (let i = 0; i < createdUsers.length; i++) {
    const retrievedUser: ITodoAppUser =
      await api.functional.todoApp.admin.users.at(connection, {
        userId: createdUsers[i].id,
      });
    typia.assert(retrievedUser);
    retrievedUsers.push(retrievedUser);

    // Validate retrieved user data matches created user
    TestValidator.equals(
      `retrieved user ${i + 1} ID matches created user`,
      retrievedUser.id,
      createdUsers[i].id,
    );
    TestValidator.equals(
      `retrieved user ${i + 1} email matches created user`,
      retrievedUser.email,
      createdUsers[i].email,
    );
    TestValidator.equals(
      `retrieved user ${i + 1} status is active`,
      retrievedUser.status,
      "active",
    );
    TestValidator.predicate(
      `retrieved user ${i + 1} has valid creation timestamp`,
      retrievedUser.created_at !== undefined &&
        retrievedUser.created_at.length > 0,
    );
    TestValidator.predicate(
      `retrieved user ${i + 1} has valid update timestamp`,
      retrievedUser.updated_at !== undefined &&
        retrievedUser.updated_at.length > 0,
    );
  }

  // Step 4: Verify all users were successfully retrieved
  TestValidator.equals(
    "all users retrieved successfully",
    retrievedUsers.length,
    userCount,
  );

  // Step 5: Validate admin access is unrestricted and consistent
  TestValidator.predicate(
    "admin can retrieve all user profiles without restriction",
    retrievedUsers.every((user) => user.id !== undefined),
  );

  TestValidator.predicate(
    "all retrieved users have complete profile information",
    retrievedUsers.every(
      (user) =>
        user.id !== undefined &&
        user.email !== undefined &&
        user.status !== undefined &&
        user.created_at !== undefined &&
        user.updated_at !== undefined,
    ),
  );

  // Step 6: Verify consistency between created and retrieved user data
  for (let i = 0; i < createdUsers.length; i++) {
    TestValidator.equals(
      `user ${i + 1} data consistency check - ID`,
      retrievedUsers[i].id,
      createdUsers[i].id,
    );
    TestValidator.equals(
      `user ${i + 1} data consistency check - email`,
      retrievedUsers[i].email,
      createdUsers[i].email,
    );
    TestValidator.equals(
      `user ${i + 1} data consistency check - status`,
      retrievedUsers[i].status,
      createdUsers[i].status,
    );
  }
}
