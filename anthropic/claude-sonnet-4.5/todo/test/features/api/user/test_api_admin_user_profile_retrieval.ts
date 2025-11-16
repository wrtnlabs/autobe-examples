import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that an administrator can successfully retrieve any user's account
 * information.
 *
 * This test validates the administrative privilege to access user profiles
 * across the system. It creates a regular user account and an admin account,
 * then verifies that the admin can retrieve the user's complete profile
 * information including all fields defined in the ITodoListUser schema.
 *
 * Test Flow:
 *
 * 1. Create a regular user account
 * 2. Create and authenticate an admin account
 * 3. Retrieve the user's profile using admin privileges
 * 4. Validate the retrieved profile matches the created user data
 */
export async function test_api_admin_user_profile_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "userPassword123";

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(createdUser);

  // Step 2: Create and authenticate an admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminPassword123";

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 3: Admin retrieves the user's profile
  const retrievedUser: ITodoListUser =
    await api.functional.todoList.admin.users.at(connection, {
      userId: createdUser.id,
    });
  typia.assert(retrievedUser);

  // Step 4: Validate retrieved profile matches created user data
  TestValidator.equals("user ID matches", retrievedUser.id, createdUser.id);
  TestValidator.equals(
    "user email matches",
    retrievedUser.email,
    createdUser.email,
  );
  TestValidator.equals(
    "email verification status matches",
    retrievedUser.email_verified,
    createdUser.email_verified,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedUser.created_at,
    createdUser.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedUser.updated_at,
    createdUser.updated_at,
  );
  TestValidator.equals(
    "deleted_at matches",
    retrievedUser.deleted_at,
    createdUser.deleted_at,
  );
}
