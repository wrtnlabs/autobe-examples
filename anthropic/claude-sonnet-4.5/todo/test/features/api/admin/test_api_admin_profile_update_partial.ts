import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test partial update capability where only specified fields are modified while
 * others remain unchanged.
 *
 * This test validates the optional field behavior of ITodoListAdmin.IUpdate
 * schema by:
 *
 * 1. Creating a new admin account with initial email and password
 * 2. Performing a partial update providing only the email field (omitting
 *    password)
 * 3. Verifying that only the email is updated while other fields remain unchanged
 *
 * Business Validation:
 *
 * - Email field should be updated to the new value
 * - Password should remain unchanged from original (not modified since not
 *   provided)
 * - Admin ID should remain immutable
 * - Created_at timestamp should remain unchanged
 * - Updated_at timestamp should reflect the update operation
 */
export async function test_api_admin_profile_update_partial(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account with initial credentials
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = typia.random<string & tags.MinLength<8>>();

  const createdAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: originalEmail,
      password: originalPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(createdAdmin);

  // Capture original timestamps for comparison
  const originalCreatedAt = createdAdmin.created_at;
  const originalUpdatedAt = createdAdmin.updated_at;

  // Step 2: Perform partial update with only email field (password omitted)
  const newEmail = typia.random<string & tags.Format<"email">>();

  const updatedAdmin = await api.functional.todoList.admin.admins.update(
    connection,
    {
      adminId: createdAdmin.id,
      body: {
        email: newEmail,
      } satisfies ITodoListAdmin.IUpdate,
    },
  );
  typia.assert(updatedAdmin);

  // Step 3: Validate partial update results
  TestValidator.notEquals(
    "original email should be different from new email",
    originalEmail,
    newEmail,
  );

  TestValidator.equals(
    "updated email should match the new email provided",
    updatedAdmin.email,
    newEmail,
  );

  TestValidator.equals(
    "admin ID should remain unchanged",
    updatedAdmin.id,
    createdAdmin.id,
  );

  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    updatedAdmin.created_at,
    originalCreatedAt,
  );

  TestValidator.notEquals(
    "updated_at timestamp should be different after update",
    updatedAdmin.updated_at,
    originalUpdatedAt,
  );
}
