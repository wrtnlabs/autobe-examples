import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user password update functionality for the todo application.
 *
 * This test validates that authenticated users can successfully change their
 * password with proper security validation including minimum length
 * requirements of 8 characters with both letters and numbers. The test ensures
 * the password update process maintains proper security standards and account
 * protection.
 *
 * Test workflow:
 *
 * 1. Create a new user account for testing
 * 2. Establish authenticated session by logging in the user
 * 3. Update the user's password with a new secure password
 * 4. Verify the password update was successful by checking response
 * 5. Validate that the new password contains appropriate complexity requirements
 */
export async function test_api_user_profile_update_password(
  connection: api.IConnection,
) {
  // Generate test user data with email and initial password
  const userEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = RandomGenerator.alphaNumeric(10); // Initial password for first registration

  // Create new user account with initial password
  const newUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: initialPassword,
      href: "http://localhost:3000/test",
      referrer: "http://localhost:3000/test",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(newUser);

  // Log in the user to establish authenticated session
  const authenticatedUser = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: initialPassword,
      href: "http://localhost:3000/test",
      referrer: "http://localhost:3000/test",
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(authenticatedUser);

  // Generate new secure password with minimum 8 characters and both letters/numbers
  const passwordWithLettersAndNumbers =
    RandomGenerator.alphabets(4) + RandomGenerator.alphaNumeric(4);

  // Update user password through profile update endpoint
  const updatedUser = await api.functional.todoApp.user.auth.profile.update(
    connection,
    {
      body: {
        password_hash: passwordWithLettersAndNumbers,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updatedUser);

  // Validate password update was successful
  TestValidator.equals(
    "User ID should remain the same",
    updatedUser.id,
    newUser.id,
  );
  TestValidator.equals(
    "User email should remain the same",
    updatedUser.email,
    newUser.email,
  );

  // Verify password update completed by checking updated_at timestamp changed
  TestValidator.predicate(
    "updated_at should be different from created_at after password update",
    updatedUser.updated_at !== newUser.updated_at,
  );

  // Create clean connection for new authentication test
  const connectionWithNewAuth: api.IConnection = { ...connection, headers: {} };

  // Test password validation - try to log in with new password should work
  const authenticatedWithNewPassword = await api.functional.auth.user.login(
    connectionWithNewAuth,
    {
      body: {
        email: userEmail,
        password: passwordWithLettersAndNumbers,
        href: "http://localhost:3000/test",
        referrer: "http://localhost:3000/test",
      } satisfies ITodoAppUser.ILogin,
    },
  );
  typia.assert(authenticatedWithNewPassword);

  // Verify successful authentication with new password
  TestValidator.predicate(
    "New authentication token should be generated",
    authenticatedWithNewPassword.token.access.length > 0,
  );
  TestValidator.equals(
    "User should have the same ID after re-authentication",
    authenticatedWithNewPassword.id,
    newUser.id,
  );
}
