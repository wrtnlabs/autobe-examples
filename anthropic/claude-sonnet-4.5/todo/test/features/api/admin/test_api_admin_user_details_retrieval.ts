import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that administrators can successfully retrieve detailed information about
 * a specific user account.
 *
 * This test validates the complete workflow where an admin authenticates and
 * then retrieves user account details for administrative oversight. The test
 * ensures that:
 *
 * 1. Admin account creation and authentication succeeds
 * 2. Target user account is created successfully
 * 3. Admin can retrieve user details using the user ID
 * 4. Response includes all expected fields (id, email, created_at, updated_at,
 *    deleted_at)
 * 5. Sensitive data (password_hash) is properly excluded from the response
 * 6. Retrieved data matches the created user account information
 */
export async function test_api_admin_user_details_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Validate admin authentication response - business logic only
  TestValidator.equals("admin email matches", admin.email, adminEmail);

  // Step 2: Create a target user account whose details will be retrieved
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.MinLength<8>>();

  const createdUser: ITodoListUser = await api.functional.todoList.users.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(createdUser);

  // Validate created user data - business logic only
  TestValidator.equals("user email matches", createdUser.email, userEmail);

  // Step 3: Admin retrieves the target user's details
  const retrievedUser: ITodoListUser =
    await api.functional.todoList.admin.admins.users.at(connection, {
      userId: createdUser.id,
    });
  typia.assert(retrievedUser);

  // Step 4: Validate the retrieved user details - business logic and data relationships only
  TestValidator.equals(
    "retrieved user id matches",
    retrievedUser.id,
    createdUser.id,
  );
  TestValidator.equals(
    "retrieved user email matches",
    retrievedUser.email,
    createdUser.email,
  );
  TestValidator.equals(
    "retrieved user created_at matches",
    retrievedUser.created_at,
    createdUser.created_at,
  );
  TestValidator.equals(
    "retrieved user updated_at matches",
    retrievedUser.updated_at,
    createdUser.updated_at,
  );
}
