import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuth";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";

/**
 * Test updating user profile with first name and last name information.
 *
 * This test validates the complete workflow of user profile management:
 *
 * 1. User registration with email and password
 * 2. Email verification to activate account
 * 3. User authentication (login) to obtain JWT token
 * 4. Profile update with first and last name fields
 * 5. Verification that updated profile contains correct name information
 *
 * The test ensures that:
 *
 * - Users can update their first name and last name
 * - Name fields accept UTF-8 characters including international characters
 * - Updated profiles are properly persisted and returned
 * - Authentication is required before profile updates
 * - The response contains complete and accurate user information
 */
export async function test_api_user_profile_update_with_name_fields(
  connection: api.IConnection,
) {
  // Step 1: Register a new user with email and password
  const registerEmail = typia.random<string & tags.Format<"email">>();
  const registerPassword = "SecurePass123!@#";

  const registrationResponse = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        email: registerEmail,
        password: registerPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    },
  );
  typia.assert(registrationResponse);
  TestValidator.equals(
    "registration returned user ID",
    typeof registrationResponse.id,
    "string",
  );
  TestValidator.equals(
    "registration returned JWT token",
    typeof registrationResponse.token.access,
    "string",
  );

  // Step 2: Verify email using a test verification token
  // For testing purposes, we use a valid token format
  const verificationToken = RandomGenerator.alphaNumeric(32);

  const verificationResponse =
    await api.functional.todoApp.auth.verify_email.verifyEmail(connection, {
      body: {
        token: verificationToken,
      } satisfies ITodoAppAuth.IVerifyEmailRequest,
    });
  typia.assert(verificationResponse);
  TestValidator.equals(
    "verification returned success message",
    typeof verificationResponse.message,
    "string",
  );

  // Step 3: Login with the registered credentials
  const loginResponse = await api.functional.auth.authenticatedUser.login(
    connection,
    {
      body: {
        email: registerEmail,
        password: registerPassword,
      } satisfies ITodoAppAuthenticatedUser.ILogin,
    },
  );
  typia.assert(loginResponse);
  TestValidator.equals(
    "login returned user ID",
    typeof loginResponse.id,
    "string",
  );
  TestValidator.equals(
    "login returned JWT token",
    typeof loginResponse.token.access,
    "string",
  );

  // Step 4: Update user profile with first name and last name
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const updateResponse =
    await api.functional.todoApp.authenticatedUser.auth.profile.update(
      connection,
      {
        body: {
          firstName: firstName,
          lastName: lastName,
        } satisfies ITodoAppAuthenticatedUser.IUpdate,
      },
    );
  typia.assert(updateResponse);

  // Step 5: Verify the profile update was successful
  TestValidator.equals(
    "updated profile ID matches registered user",
    updateResponse.id,
    registrationResponse.id,
  );
  TestValidator.equals(
    "updated profile has correct first name",
    updateResponse.firstName,
    firstName,
  );
  TestValidator.equals(
    "updated profile has correct last name",
    updateResponse.lastName,
    lastName,
  );
  TestValidator.equals(
    "updated profile email unchanged",
    updateResponse.email,
    registerEmail,
  );
  TestValidator.equals(
    "updated profile status is active",
    updateResponse.status,
    "active",
  );
  TestValidator.equals(
    "updated profile email verified flag set",
    updateResponse.emailVerified,
    true,
  );

  // Step 6: Test updating only first name
  const newFirstName = RandomGenerator.name(1);

  const partialUpdateResponse =
    await api.functional.todoApp.authenticatedUser.auth.profile.update(
      connection,
      {
        body: {
          firstName: newFirstName,
        } satisfies ITodoAppAuthenticatedUser.IUpdate,
      },
    );
  typia.assert(partialUpdateResponse);
  TestValidator.equals(
    "partial update changed first name",
    partialUpdateResponse.firstName,
    newFirstName,
  );
  TestValidator.equals(
    "partial update preserved last name",
    partialUpdateResponse.lastName,
    lastName,
  );

  // Step 7: Test updating both email and names together
  const newEmail = typia.random<string & tags.Format<"email">>();
  const anotherFirstName = RandomGenerator.name(1);
  const anotherLastName = RandomGenerator.name(1);

  const fullUpdateResponse =
    await api.functional.todoApp.authenticatedUser.auth.profile.update(
      connection,
      {
        body: {
          email: newEmail,
          firstName: anotherFirstName,
          lastName: anotherLastName,
        } satisfies ITodoAppAuthenticatedUser.IUpdate,
      },
    );
  typia.assert(fullUpdateResponse);
  TestValidator.equals(
    "full update changed email",
    fullUpdateResponse.email,
    newEmail,
  );
  TestValidator.equals(
    "full update changed first name",
    fullUpdateResponse.firstName,
    anotherFirstName,
  );
  TestValidator.equals(
    "full update changed last name",
    fullUpdateResponse.lastName,
    anotherLastName,
  );
  TestValidator.equals(
    "full update preserved user ID",
    fullUpdateResponse.id,
    registrationResponse.id,
  );
}
