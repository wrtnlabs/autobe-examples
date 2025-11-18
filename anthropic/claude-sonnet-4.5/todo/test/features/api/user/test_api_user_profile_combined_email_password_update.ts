import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test simultaneous email and password update in a single operation.
 *
 * This test validates that users can update both email and password together in
 * one atomic request. It verifies that the partial update mechanism handles
 * multiple field changes, normalizes the email to lowercase, and refreshes the
 * updated_at timestamp.
 *
 * Flow:
 *
 * 1. Register initial user with original credentials
 * 2. Update both email and password simultaneously with current password
 *    verification
 * 3. Verify response shows new email (lowercase) and updated timestamp
 * 4. Validate that updated_at is greater than or equal to created_at
 * 5. Confirm user ID remains unchanged after update
 */
export async function test_api_user_profile_combined_email_password_update(
  connection: api.IConnection,
) {
  // Step 1: Register initial user with original credentials
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();

  const registered: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: originalEmail,
        password: originalPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registered);

  // Verify initial email is normalized to lowercase
  TestValidator.equals(
    "registered email is lowercase",
    registered.email,
    originalEmail.toLowerCase(),
  );

  // Step 2: Prepare new credentials for simultaneous update
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();

  // Step 3: Update both email and password in a single operation
  const updated: ITodoListUser =
    await api.functional.todoList.user.users.me.update(connection, {
      body: {
        email: newEmail,
        password: newPassword,
        current_password: originalPassword,
      } satisfies ITodoListUser.IUpdate,
    });
  typia.assert(updated);

  // Step 4: Verify response reflects new email in lowercase format
  TestValidator.equals(
    "updated email matches new email in lowercase",
    updated.email,
    newEmail.toLowerCase(),
  );

  // Step 5: Verify updated_at timestamp is refreshed (should be after or equal to created_at)
  const updatedTime = new Date(updated.updated_at).getTime();
  const createdTime = new Date(updated.created_at).getTime();
  TestValidator.predicate(
    "updated_at is refreshed after update",
    updatedTime >= createdTime,
  );

  // Step 6: Verify ID remains unchanged
  TestValidator.equals(
    "user ID remains unchanged after update",
    updated.id,
    registered.id,
  );

  // Step 7: Verify created_at remains unchanged (immutable field)
  TestValidator.equals(
    "created_at remains unchanged after update",
    updated.created_at,
    registered.created_at,
  );
}
