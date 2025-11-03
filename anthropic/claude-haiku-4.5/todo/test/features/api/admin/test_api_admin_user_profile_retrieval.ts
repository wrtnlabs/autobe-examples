import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test admin accessing any user's profile information.
 *
 * Validates that administrators have elevated permissions to view any user
 * account. Tests the complete workflow: admin registration, authentication,
 * user profile retrieval, and verification of all user profile fields with
 * proper authorization context.
 *
 * Workflow:
 *
 * 1. Admin creates account with valid credentials
 * 2. Admin receives JWT access token upon successful registration
 * 3. Regular user account is created to serve as target for profile retrieval
 * 4. Admin retrieves the regular user's complete profile using admin endpoint
 * 5. Validates all profile fields are present and correct
 * 6. Confirms admin authorization is properly enforced
 */
export async function test_api_admin_user_profile_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Admin registration with valid email and password
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12); // 12 characters, meets 8+ requirement
  const confirmPassword = adminPassword; // Must match for registration

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        password_confirmation: confirmPassword,
      } satisfies ITodoAppAdmin.IRegister,
    },
  );
  typia.assert(admin);

  // Verify admin authorization response contains all required fields
  TestValidator.equals(
    "admin email matches registration email",
    admin.email,
    adminEmail,
  );
  TestValidator.equals("admin status is active", admin.status, "active");
  TestValidator.predicate(
    "admin id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      admin.id,
    ),
  );
  TestValidator.predicate(
    "admin has access token",
    admin.token.access !== undefined && admin.token.access.length > 0,
  );

  // Step 2: Create regular user account to retrieve
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(12);

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

  // Verify user was created successfully
  TestValidator.equals(
    "created user email matches registration email",
    user.email,
    userEmail,
  );
  TestValidator.equals("created user status is active", user.status, "active");

  // Step 3: Admin retrieves the regular user's profile
  const retrievedUser: ITodoAppUser =
    await api.functional.todoApp.admin.users.at(connection, {
      userId: user.id,
    });
  typia.assert(retrievedUser);

  // Step 4: Validate all user profile fields are present and correct
  TestValidator.equals(
    "retrieved user id matches created user id",
    retrievedUser.id,
    user.id,
  );
  TestValidator.equals(
    "retrieved user email matches created user email",
    retrievedUser.email,
    user.email,
  );
  TestValidator.equals(
    "retrieved user status matches created user status",
    retrievedUser.status,
    user.status,
  );
  TestValidator.predicate(
    "retrieved user created_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(retrievedUser.created_at),
  );
  TestValidator.predicate(
    "retrieved user updated_at is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(retrievedUser.updated_at),
  );

  // Step 5: Verify complete profile information consistency
  TestValidator.equals(
    "all user profile fields match between creation and retrieval",
    retrievedUser,
    user,
  );
}
