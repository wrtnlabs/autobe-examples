import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that the user profile data retrieved by admin matches the data created
 * during user registration.
 *
 * This test validates data integrity and consistency between registration and
 * retrieval operations. It ensures that when a user account is created with
 * specific email and registration details, the admin retrieval endpoint returns
 * accurate, unmodified user data from the database.
 *
 * Test workflow:
 *
 * 1. Create a user account with known data values for consistency verification
 * 2. Create an administrator account to retrieve and verify user data
 * 3. Admin retrieves the user profile using the user ID
 * 4. Verify all fields match exactly between registration and retrieval
 */
export async function test_api_admin_user_profile_data_consistency(
  connection: api.IConnection,
) {
  // Step 1: Create a user account with specific known data
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";
  const userHref = typia.random<string & tags.Format<"uri">>();
  const userReferrer = typia.random<string & tags.Format<"uri">>();

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: userHref,
      referrer: userReferrer,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registeredUser);

  // Step 2: Create admin account for user management access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminPassword123";
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Admin retrieves the user profile
  const retrievedUser = await api.functional.todoList.admin.users.at(
    connection,
    {
      userId: registeredUser.id,
    },
  );
  typia.assert(retrievedUser);

  // Step 4: Verify data consistency between registration and retrieval
  TestValidator.equals("user ID matches", retrievedUser.id, registeredUser.id);
  TestValidator.equals(
    "user email matches",
    retrievedUser.email,
    registeredUser.email,
  );
  TestValidator.equals(
    "email verified status matches",
    retrievedUser.email_verified,
    registeredUser.email_verified,
  );
  TestValidator.equals(
    "created_at timestamp matches",
    retrievedUser.created_at,
    registeredUser.created_at,
  );
  TestValidator.equals(
    "updated_at timestamp matches",
    retrievedUser.updated_at,
    registeredUser.updated_at,
  );
  TestValidator.equals(
    "deleted_at status matches",
    retrievedUser.deleted_at,
    registeredUser.deleted_at,
  );
}
