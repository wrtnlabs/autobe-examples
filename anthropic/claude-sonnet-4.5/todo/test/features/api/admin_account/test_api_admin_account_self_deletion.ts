import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test the complete workflow of an administrator deleting their own account
 * through self-service account management.
 *
 * This scenario validates that an admin can successfully perform a soft delete
 * on their own account. The test creates a new admin account through
 * registration, authenticates as that admin automatically during registration,
 * and then performs the account deletion operation.
 *
 * The test verifies successful account creation and successful execution of the
 * self-deletion endpoint, which performs a soft delete by setting the
 * deleted_at timestamp in the todo_list_admins table.
 *
 * Test Flow:
 *
 * 1. Create a new admin account through registration
 * 2. Verify the admin account was created successfully with valid authentication
 *    tokens
 * 3. Perform self-deletion of the admin account using the authenticated session
 */
export async function test_api_admin_account_self_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account through registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const registrationBody = {
    email: adminEmail,
    password: adminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const createdAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationBody,
    });
  typia.assert(createdAdmin);

  // Step 2: Verify the admin email matches what was registered
  TestValidator.equals(
    "admin email matches registration email",
    createdAdmin.email,
    adminEmail,
  );

  // Step 3: Perform self-deletion of the admin account
  // The admin is already authenticated from the registration call above
  await api.functional.todoList.admin.admins.me.erase(connection);
}
