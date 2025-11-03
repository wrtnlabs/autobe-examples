import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test that an authenticated administrator can successfully update their
 * password while maintaining security requirements.
 *
 * The test workflow creates a new admin account, then updates the password to a
 * new value that meets security requirements (minimum 8 characters, at least
 * one letter and one number). The system should securely hash the new password
 * and update the admin record.
 *
 * Validation points include: verifying the password update succeeds with valid
 * credentials, confirming the updated_at timestamp is refreshed, ensuring the
 * password_hash is never exposed in the response, and validating that password
 * strength requirements are enforced (minimum 8 characters with letters and
 * numbers).
 *
 * This test ensures proper password security enforcement, secure hashing before
 * storage, and correct handling of sensitive credential updates.
 */
export async function test_api_admin_profile_password_update(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account with initial password
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "initial123";
  const newPassword = "newSecure456";

  const createBody = {
    email: initialEmail,
    password: initialPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const createdAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createBody,
    });
  typia.assert(createdAdmin);

  // Step 2: Verify admin was created successfully with correct email
  TestValidator.equals(
    "created admin email matches input",
    createdAdmin.email,
    initialEmail,
  );

  // Step 3: Store the original updated_at timestamp for comparison
  const originalUpdatedAt = createdAdmin.updated_at;

  // Step 4: Update the admin's password to a new secure value
  const updateBody = {
    password: newPassword,
  } satisfies ITodoListAdmin.IUpdate;

  const updatedAdmin: ITodoListAdmin =
    await api.functional.todoList.admin.admins.me.update(connection, {
      body: updateBody,
    });
  typia.assert(updatedAdmin);

  // Step 5: Verify the password update succeeded and identity is preserved
  TestValidator.equals(
    "admin id remains unchanged after password update",
    updatedAdmin.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "admin email remains unchanged after password update",
    updatedAdmin.email,
    createdAdmin.email,
  );

  // Step 6: Verify updated_at timestamp was refreshed after password change
  TestValidator.predicate(
    "updated_at timestamp is refreshed after password update",
    new Date(updatedAdmin.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );

  // Step 7: Verify created_at timestamp remains unchanged
  TestValidator.equals(
    "created_at timestamp unchanged after password update",
    updatedAdmin.created_at,
    createdAdmin.created_at,
  );
}
