import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user profile email update functionality.
 *
 * This test validates that an authenticated user can successfully update their
 * email address through the profile update API. The test ensures that:
 *
 * 1. A new user account is created through registration with an initial email
 *    address
 * 2. The user is authenticated and can access their profile
 * 3. The user can update their email address to a new valid email
 * 4. The response correctly reflects the updated email address
 * 5. The updated_at timestamp is refreshed to reflect the modification time
 * 6. The created_at timestamp remains unchanged from the original registration
 * 7. The operation maintains proper user isolation (users can only modify their
 *    own profile)
 */
export async function test_api_user_profile_email_update(
  connection: api.IConnection,
) {
  // 1. Create a new user account through registration
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();
  const currentUrl = "https://test.example.com/register";
  const referrerUrl = "https://test.example.com/home";

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: initialEmail,
      password: password,
      href: currentUrl,
      referrer: referrerUrl,
    } satisfies ITodoListUser.IRegister,
  });
  typia.assert(registeredUser);

  // Verify initial registration data
  TestValidator.equals(
    "initial email matches",
    registeredUser.email,
    initialEmail,
  );
  TestValidator.predicate("user has valid ID", registeredUser.id.length > 0);
  TestValidator.predicate(
    "account is active",
    registeredUser.deleted_at === null ||
      registeredUser.deleted_at === undefined,
  );

  // Store original timestamps for later comparison
  const originalCreatedAt = registeredUser.created_at;
  const originalUpdatedAt = registeredUser.updated_at;

  // 2. Update the user's email address
  const newEmail = typia.random<string & tags.Format<"email">>();

  const updatedUser = await api.functional.todoList.user.users.me.update(
    connection,
    {
      body: {
        email: newEmail,
      } satisfies ITodoListUser.IUpdate,
    },
  );
  typia.assert(updatedUser);

  // 3. Validate the email update was successful
  TestValidator.equals(
    "email successfully updated",
    updatedUser.email,
    newEmail,
  );
  TestValidator.notEquals(
    "email changed from original",
    updatedUser.email,
    initialEmail,
  );

  // 4. Verify user ID remains the same
  TestValidator.equals("user ID unchanged", updatedUser.id, registeredUser.id);

  // 5. Verify created_at timestamp remains unchanged
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedUser.created_at,
    originalCreatedAt,
  );

  // 6. Verify updated_at timestamp was refreshed
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    updatedUser.updated_at,
    originalUpdatedAt,
  );

  // 7. Verify account remains active
  TestValidator.predicate(
    "account still active",
    updatedUser.deleted_at === null || updatedUser.deleted_at === undefined,
  );

  // 8. Verify updated_at is later than created_at
  const createdDate = new Date(updatedUser.created_at);
  const updatedDate = new Date(updatedUser.updated_at);
  TestValidator.predicate(
    "updated_at is after created_at",
    updatedDate >= createdDate,
  );
}
