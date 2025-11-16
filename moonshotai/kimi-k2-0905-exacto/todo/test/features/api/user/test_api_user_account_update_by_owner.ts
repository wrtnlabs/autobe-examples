import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test complete user account update workflow where an authenticated user
 * updates their own email address. The scenario validates successful
 * authentication, proper email format validation, and secure account
 * modification. Tests the complete flow from user registration to profile
 * update, ensuring that users can only modify their own account information
 * through proper authorization checks. Validates that update operations
 * automatically track modification timestamps and maintain data integrity
 * throughout the process.
 */
export async function test_api_user_account_update_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const clientUrl = "https://example.com/register";
  const referrerUrl = "https://example.com";

  const newUser = await api.functional.auth.user.join(connection, {
    body: {
      email: originalEmail,
      password: "SecurePass123",
      ip: "192.168.1.1",
      href: clientUrl,
      referrer: referrerUrl,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(newUser);

  // Verify user creation was successful
  TestValidator.equals(
    "user email matches registration",
    newUser.email,
    originalEmail,
  );
  TestValidator.predicate(
    "user is authenticated with token",
    !!newUser.token.access,
  );

  // Store original timestamps for comparison
  const originalCreatedAt = newUser.created_at;
  const originalUpdatedAt = newUser.updated_at;

  // Step 2: Update user email address
  const newEmail = typia.random<string & tags.Format<"email">>();

  // Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  const updatedUser = await api.functional.todoApp.user.auth.users.update(
    connection,
    {
      userId: newUser.id,
      body: {
        email: newEmail,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updatedUser);

  // Step 3: Validate the update was successful
  TestValidator.equals(
    "user ID remains consistent",
    updatedUser.id,
    newUser.id,
  );
  TestValidator.equals(
    "email was successfully updated",
    updatedUser.email,
    newEmail,
  );
  TestValidator.notEquals(
    "email address changed",
    updatedUser.email,
    originalEmail,
  );

  // Verify timestamps - created_at should remain unchanged, updated_at should change
  TestValidator.equals(
    "account creation timestamp unchanged",
    updatedUser.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "account updated timestamp changed",
    updatedUser.updated_at !== originalUpdatedAt,
  );
  TestValidator.predicate(
    "updated timestamp is later than original",
    new Date(updatedUser.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );

  // Step 4: Test business scenario - update back to original email
  const revertedUser = await api.functional.todoApp.user.auth.users.update(
    connection,
    {
      userId: newUser.id,
      body: {
        email: originalEmail,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(revertedUser);

  TestValidator.equals(
    "email reverted successfully",
    revertedUser.email,
    originalEmail,
  );
  TestValidator.predicate(
    "revert operation updates timestamp again",
    revertedUser.updated_at !== updatedUser.updated_at,
  );

  // Step 5: Test partial update (not changing email)
  const partialUpdateUser = await api.functional.todoApp.user.auth.users.update(
    connection,
    {
      userId: newUser.id,
      body: {
        email: originalEmail, // Same email, testing if API handles no-change updates
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(partialUpdateUser);

  TestValidator.equals(
    "partial update keeps email unchanged",
    partialUpdateUser.email,
    originalEmail,
  );
  TestValidator.predicate(
    "even no-change updates update timestamp",
    partialUpdateUser.updated_at !== revertedUser.updated_at,
  );
}
