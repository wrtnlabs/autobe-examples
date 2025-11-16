import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that administrators can update any user account information.
 *
 * This test validates administrative user management capabilities by verifying
 * that admin accounts have the authority to modify any user's account data
 * while maintaining system integrity constraints.
 *
 * Workflow:
 *
 * 1. Create a regular user account that will be updated by admin
 * 2. Create an admin account with user management privileges
 * 3. Admin updates the regular user's email and password
 * 4. Verify updated user information is returned correctly
 * 5. Confirm data modifications are persisted
 * 6. Validate email uniqueness is still enforced for admin updates
 * 7. Verify updated_at timestamp reflects the modification
 */
export async function test_api_admin_user_management_update_any_account(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user account that will be the target of admin updates
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUserPassword = typia.random<string & tags.MinLength<8>>();

  const regularUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: regularUserEmail,
        password: regularUserPassword,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(regularUser);

  // Create a second user to test email uniqueness constraints
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: secondUserEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(secondUser);

  // Step 2: Create an admin account to perform the update operation
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

  // Step 3: Admin updates the regular user's email and password
  const newUserEmail = typia.random<string & tags.Format<"email">>();
  const newUserPassword = typia.random<string & tags.MinLength<8>>();

  const updatedUser: ITodoListUser =
    await api.functional.todoList.admin.users.update(connection, {
      userId: regularUser.id,
      body: {
        email: newUserEmail,
        password: newUserPassword,
      } satisfies ITodoListUser.IUpdate,
    });
  typia.assert(updatedUser);

  // Step 4: Verify the response contains updated user information
  TestValidator.equals(
    "updated email matches",
    updatedUser.email,
    newUserEmail,
  );
  TestValidator.equals("user ID unchanged", updatedUser.id, regularUser.id);

  // Step 5: Confirm the regular user's data is properly modified
  TestValidator.predicate(
    "email was changed from original",
    updatedUser.email !== regularUserEmail,
  );

  // Step 6: Validate that email uniqueness is still enforced even for admin updates
  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.todoList.admin.users.update(connection, {
      userId: regularUser.id,
      body: {
        email: secondUserEmail,
      } satisfies ITodoListUser.IUpdate,
    });
  });

  // Step 7: Test that updated_at timestamp reflects the modification
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedUser.updated_at).getTime() >=
      new Date(regularUser.created_at).getTime(),
  );
}
