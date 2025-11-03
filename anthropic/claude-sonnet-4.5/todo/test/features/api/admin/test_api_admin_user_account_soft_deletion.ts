import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test administrative user account soft deletion functionality.
 *
 * This test validates the complete workflow where an administrator
 * authenticates, a user account is created, and then the admin performs a soft
 * delete operation on that account. The test verifies that soft deletion
 * properly sets the deleted_at timestamp while preserving all account data for
 * audit purposes.
 *
 * Process:
 *
 * 1. Create and authenticate an administrator account
 * 2. Create a target user account to be deleted
 * 3. Execute soft delete operation as admin
 * 4. Validate deleted_at timestamp is set and data is preserved
 */
export async function test_api_admin_user_account_soft_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // Step 2: Create target user account to be soft deleted
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userBody = {
    email: userEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.ICreate;

  const user: ITodoListUser = await api.functional.todoList.users.join(
    connection,
    {
      body: userBody,
    },
  );
  typia.assert(user);

  // Step 3: Soft delete the user account as admin
  const deletedUser: ITodoListUser =
    await api.functional.todoList.admin.admins.users.erase(connection, {
      userId: user.id,
    });
  typia.assert(deletedUser);

  // Step 4: Validate soft deletion results
  TestValidator.equals("user ID should match", deletedUser.id, user.id);
  TestValidator.equals(
    "email should be preserved",
    deletedUser.email,
    user.email,
  );
  TestValidator.equals(
    "created_at should be preserved",
    deletedUser.created_at,
    user.created_at,
  );
  TestValidator.predicate(
    "deleted_at should be set",
    deletedUser.deleted_at !== null && deletedUser.deleted_at !== undefined,
  );
}
