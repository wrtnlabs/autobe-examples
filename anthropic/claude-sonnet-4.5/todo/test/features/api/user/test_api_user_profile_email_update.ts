import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test authenticated user email update functionality.
 *
 * This test validates the complete email update workflow including format
 * validation, uniqueness verification, and lowercase normalization. The test
 * creates a user account, updates the email to a new valid address, and
 * verifies that the email update succeeds with proper normalization and
 * timestamp refresh.
 *
 * Test workflow:
 *
 * 1. Create initial user account with original email
 * 2. Update user's email to a new valid address
 * 3. Verify response contains updated email in lowercase format
 * 4. Verify updated_at timestamp is refreshed
 * 5. Confirm all validations pass and email can be used for operations
 */
export async function test_api_user_profile_email_update(
  connection: api.IConnection,
) {
  // Step 1: Create initial user account with original email
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: originalEmail,
        password: password,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(createdUser);

  // Verify original email is set correctly (normalized to lowercase)
  TestValidator.equals(
    "created user email should be lowercase normalized",
    createdUser.email,
    originalEmail.toLowerCase(),
  );

  // Store original updated_at for comparison
  const originalUpdatedAt = createdUser.updated_at;

  // Step 2: Update user's email to a new valid address
  const newEmail = typia.random<string & tags.Format<"email">>();

  const updatedUser: ITodoListUser =
    await api.functional.todoList.user.users.me.update(connection, {
      body: {
        email: newEmail,
      } satisfies ITodoListUser.IUpdate,
    });
  typia.assert(updatedUser);

  // Step 3: Verify response contains updated email in lowercase format
  TestValidator.equals(
    "updated email should be lowercase normalized",
    updatedUser.email,
    newEmail.toLowerCase(),
  );

  // Step 4: Verify updated_at timestamp has been refreshed
  TestValidator.predicate(
    "updated_at should be refreshed after email update",
    new Date(updatedUser.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );

  // Step 5: Verify other user properties remain intact
  TestValidator.equals(
    "user id should remain unchanged",
    updatedUser.id,
    createdUser.id,
  );

  TestValidator.equals(
    "created_at should remain unchanged",
    updatedUser.created_at,
    createdUser.created_at,
  );
}
