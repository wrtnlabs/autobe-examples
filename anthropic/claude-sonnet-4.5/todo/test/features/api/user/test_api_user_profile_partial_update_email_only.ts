import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test partial update of user profile with email-only modification.
 *
 * This test validates that users can update only their email address without
 * providing password or current_password fields. It confirms that:
 *
 * 1. Email can be updated independently without any password fields
 * 2. The password and current_password fields are optional when updating email
 * 3. The updated_at timestamp is refreshed even for single-field updates
 * 4. The created_at timestamp and user ID remain unchanged
 * 5. The new email is properly validated and stored
 *
 * Test workflow:
 *
 * 1. Create initial user account with email and password
 * 2. Perform partial update with ONLY new email (omit password fields)
 * 3. Verify email was updated to the new value
 * 4. Verify created_at remains unchanged
 * 5. Verify updated_at was refreshed
 * 6. Verify user ID remains the same
 */
export async function test_api_user_profile_partial_update_email_only(
  connection: api.IConnection,
) {
  // Step 1: Create initial user account
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: originalEmail,
        password: originalPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(createdUser);

  // Capture original timestamps for comparison
  const originalCreatedAt = createdUser.created_at;
  const originalUpdatedAt = createdUser.updated_at;

  // Step 2: Perform partial update with ONLY new email (no password fields)
  const newEmail = typia.random<string & tags.Format<"email">>();

  const updatedUser: ITodoListUser =
    await api.functional.todoList.user.users.me.update(connection, {
      body: {
        email: newEmail,
        // Intentionally omitting password and current_password fields
        // to test optional field behavior
      } satisfies ITodoListUser.IUpdate,
    });
  typia.assert(updatedUser);

  // Step 3: Verify email was updated
  TestValidator.equals("email should be updated", updatedUser.email, newEmail);

  // Step 4: Verify created_at timestamp remains unchanged
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedUser.created_at,
    originalCreatedAt,
  );

  // Step 5: Verify updated_at timestamp was refreshed
  TestValidator.predicate(
    "updated_at should be refreshed",
    new Date(updatedUser.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );

  // Step 6: Verify user ID remains the same
  TestValidator.equals(
    "user ID should remain unchanged",
    updatedUser.id,
    createdUser.id,
  );
}
