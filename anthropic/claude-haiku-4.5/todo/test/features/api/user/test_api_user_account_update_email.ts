import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful user account email update.
 *
 * Validates that an authenticated user can update their own email address to a
 * new unique email. The test creates a user account, updates the email to a new
 * value, retrieves the account to verify the change was persisted, and confirms
 * the updated_at timestamp reflects the modification. This tests the core
 * profile update workflow for users to manage their account information.
 *
 * 1. Create a new user account with initial email via registration
 * 2. Capture the created user ID and initial timestamps
 * 3. Update the user's email to a new unique value
 * 4. Verify the update response contains the new email
 * 5. Confirm the updated_at timestamp is newer than created_at
 * 6. Validate that the email change persisted in the system
 */
export async function test_api_user_account_update_email(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123";

  const createdUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: initialEmail,
        password: password,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(createdUser);

  // Verify the initial creation
  TestValidator.equals(
    "created user email matches",
    createdUser.email,
    initialEmail,
  );
  TestValidator.equals(
    "created user status is active",
    createdUser.status,
    "active",
  );

  // Step 2: Generate new unique email for update
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  TestValidator.notEquals(
    "new email differs from initial",
    updatedEmail,
    initialEmail,
  );

  // Step 3: Update the user's email
  const updateBody = {
    email: updatedEmail,
  } satisfies ITodoAppUser.IUpdate;

  const updatedUser: ITodoAppUser = await api.functional.todoApp.users.update(
    connection,
    {
      userId: createdUser.id,
      body: updateBody,
    },
  );
  typia.assert(updatedUser);

  // Step 4: Verify the update response
  TestValidator.equals(
    "updated user email matches new value",
    updatedUser.email,
    updatedEmail,
  );
  TestValidator.equals("user ID unchanged", updatedUser.id, createdUser.id);
  TestValidator.equals(
    "user status remains active",
    updatedUser.status,
    "active",
  );

  // Step 5: Verify updated_at timestamp is newer than created_at
  const createdAtTime = new Date(createdUser.created_at).getTime();
  const updatedAtTime = new Date(updatedUser.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is newer than created_at",
    updatedAtTime >= createdAtTime,
  );

  // Step 6: Confirm the created_at timestamp is unchanged
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedUser.created_at,
    createdUser.created_at,
  );
}
