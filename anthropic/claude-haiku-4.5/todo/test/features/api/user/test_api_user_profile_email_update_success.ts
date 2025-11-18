import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful user profile update with email change.
 *
 * Validates that an authenticated user can successfully update their profile
 * email address. The test verifies:
 *
 * 1. User registration creates initial account with email and timestamps
 * 2. Profile update API call changes email to new value
 * 3. Response contains updated email matching the new email provided
 * 4. System automatically updates the updated_at timestamp
 * 5. Immutable fields (id, created_at, deleted_at, last_login_at) remain unchanged
 *
 * This comprehensive test ensures the email update workflow functions correctly
 * while maintaining data integrity and proper timestamp management.
 */
export async function test_api_user_profile_email_update_success(
  connection: api.IConnection,
) {
  // Step 1: Register new user with initial email
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: initialEmail,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(registeredUser);

  // Capture original values for verification
  const originalId = registeredUser.id;
  const originalCreatedAt = registeredUser.created_at;
  const originalDeletedAt = registeredUser.deleted_at;
  const originalLastLoginAt = registeredUser.last_login_at;
  const originalUpdatedAt = registeredUser.updated_at;

  // Step 2: Update profile with new email address
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updatedProfile =
    await api.functional.todoList.user.auth.user.profile.update(connection, {
      body: {
        email: newEmail,
      } satisfies ITodoListUser.IUpdate,
    });
  typia.assert(updatedProfile);

  // Step 3: Verify response contains updated email and fresh timestamp
  TestValidator.equals(
    "updated profile email matches new email",
    updatedProfile.email,
    newEmail,
  );

  TestValidator.notEquals(
    "updated_at timestamp changed after update",
    updatedProfile.updated_at,
    originalUpdatedAt,
  );

  // Step 4: Confirm profile maintains all other original fields
  TestValidator.equals(
    "user id remains unchanged",
    updatedProfile.id,
    originalId,
  );

  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updatedProfile.created_at,
    originalCreatedAt,
  );

  TestValidator.equals(
    "deleted_at status remains unchanged",
    updatedProfile.deleted_at,
    originalDeletedAt,
  );

  TestValidator.equals(
    "last_login_at remains unchanged",
    updatedProfile.last_login_at,
    originalLastLoginAt,
  );
}
