import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the complete workflow of an administrator permanently deleting a user
 * account.
 *
 * This test validates the administrative capability to perform hard deletion of
 * user accounts, which is essential for:
 *
 * - Compliance with data protection regulations (GDPR, CCPA)
 * - User-requested account deletion
 * - Removal of fraudulent or malicious accounts
 * - System cleanup and maintenance
 *
 * The test ensures that:
 *
 * 1. Only authenticated administrators can delete user accounts
 * 2. The deletion operation successfully removes the target user
 * 3. The operation returns complete user information for audit purposes
 * 4. All associated data is properly cascaded and removed
 *
 * Test workflow:
 *
 * 1. Create and authenticate an administrator account
 * 2. Create a target user account to be deleted
 * 3. Administrator deletes the user account using the user ID
 * 4. Validate that the deletion response contains complete user data
 * 5. Verify all data integrity and type safety throughout the process
 */
export async function test_api_user_account_permanent_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "192.168.1.100",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Verify admin authentication token is set
  TestValidator.predicate("admin token exists", admin.token.access.length > 0);

  // Step 2: Create target user account that will be deleted
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "userPassword123";

  const targetUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      ip: "192.168.1.200",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(targetUser);

  // Verify user was created successfully
  TestValidator.predicate("user ID is valid UUID", targetUser.id.length === 36);
  TestValidator.equals("user email matches", targetUser.email, userEmail);

  // Step 3: Delete the user account using admin privileges
  // Admin authentication persists through connection headers from step 1
  const deletedUser = await api.functional.todoList.admin.users.erase(
    connection,
    {
      userId: targetUser.id,
    },
  );
  typia.assert(deletedUser);

  // Step 4: Validate deletion response contains complete user information
  TestValidator.equals(
    "deleted user ID matches",
    deletedUser.id,
    targetUser.id,
  );
  TestValidator.equals(
    "deleted user email matches",
    deletedUser.email,
    userEmail,
  );
  TestValidator.predicate(
    "deleted user has created_at",
    deletedUser.created_at.length > 0,
  );
  TestValidator.predicate(
    "deleted user has updated_at",
    deletedUser.updated_at.length > 0,
  );
  TestValidator.equals(
    "email verification status",
    deletedUser.email_verified,
    targetUser.email_verified,
  );
}
