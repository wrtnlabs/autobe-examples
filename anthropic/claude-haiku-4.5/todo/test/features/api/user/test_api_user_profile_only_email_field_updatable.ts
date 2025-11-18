import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that only the email field can be updated through the user profile
 * endpoint.
 *
 * This test validates that system-managed fields (id, created_at, updated_at,
 * deleted_at, and last_login_at) cannot be modified by users through the
 * profile update API. The endpoint should only allow updating the email field
 * while strictly protecting all system-managed fields from modification.
 *
 * The test flow:
 *
 * 1. Register a new user account to establish baseline system-managed field values
 * 2. Extract and store original timestamps and ID from the registration response
 * 3. Update the user profile with a new email address
 * 4. Verify the email has been updated
 * 5. Verify all system-managed fields remain unchanged at their original values
 */
export async function test_api_user_profile_only_email_field_updatable(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const registerEmail = typia.random<string & tags.Format<"email">>();
  const registerPassword = typia.random<string & tags.MinLength<8>>();

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: registerEmail,
      password: registerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registeredUser);

  // Step 2: Extract original system-managed field values
  const originalId = registeredUser.id;
  const originalCreatedAt = registeredUser.created_at;
  const originalUpdatedAt = registeredUser.updated_at;
  const originalDeletedAt = registeredUser.deleted_at;
  const originalLastLoginAt = registeredUser.last_login_at;

  // Step 3: Update the user profile with a new email address
  const newEmail = typia.random<string & tags.Format<"email">>();

  const updatedUser =
    await api.functional.todoList.user.auth.user.profile.update(connection, {
      body: {
        email: newEmail,
      } satisfies ITodoListUser.IUpdate,
    });
  typia.assert(updatedUser);

  // Step 4: Verify the email has been updated
  TestValidator.equals(
    "email field should be updated to new email",
    updatedUser.email,
    newEmail,
  );

  // Step 5: Verify all system-managed fields remain unchanged
  TestValidator.equals(
    "id field should not be modified",
    updatedUser.id,
    originalId,
  );

  TestValidator.equals(
    "created_at field should not be modified",
    updatedUser.created_at,
    originalCreatedAt,
  );

  TestValidator.equals(
    "updated_at field should not be modified",
    updatedUser.updated_at,
    originalUpdatedAt,
  );

  TestValidator.equals(
    "deleted_at field should not be modified",
    updatedUser.deleted_at,
    originalDeletedAt,
  );

  TestValidator.equals(
    "last_login_at field should not be modified",
    updatedUser.last_login_at,
    originalLastLoginAt,
  );
}
