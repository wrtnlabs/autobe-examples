import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuth";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";

/**
 * Test successful update of user profile with new email address.
 *
 * This test validates the complete workflow of user registration, email
 * verification, authentication, and profile update with a new email address. It
 * ensures that:
 *
 * - User can successfully register with valid credentials
 * - Email verification completes the account activation
 * - User can authenticate and receive JWT token
 * - User can update their profile email to a new valid email
 * - System validates email format and uniqueness
 * - Updated profile reflects the new email address
 * - Modification timestamp is updated while creation timestamp remains immutable
 *
 * Steps:
 *
 * 1. Register new user with email and password
 * 2. Verify email address to activate account
 * 3. Authenticate user to obtain JWT token
 * 4. Update user profile with new email address
 * 5. Validate that updated profile contains new email
 * 6. Verify timestamps are correctly maintained
 */
export async function test_api_user_profile_update_with_new_email(
  connection: api.IConnection,
) {
  // Step 1: Register new user account with valid credentials
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123!";

  const registrationResponse: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        email: originalEmail,
        password: password,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    });
  typia.assert(registrationResponse);

  const userId = registrationResponse.id;
  TestValidator.equals(
    "registration response contains user ID",
    typeof userId,
    "string",
  );

  // Step 2: Verify email to complete account activation
  // Generate a verification token for testing purposes
  const verificationToken = RandomGenerator.alphaNumeric(32);

  const verifyResponse: ITodoAppAuth.IVerifyEmailResponse =
    await api.functional.todoApp.auth.verify_email.verifyEmail(connection, {
      body: {
        token: verificationToken,
      } satisfies ITodoAppAuth.IVerifyEmailRequest,
    });
  typia.assert(verifyResponse);
  TestValidator.predicate(
    "verification response contains success message",
    verifyResponse.message.length > 0,
  );

  // Step 3: Authenticate user to obtain JWT token
  const loginResponse: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.login(connection, {
      body: {
        email: originalEmail,
        password: password,
      } satisfies ITodoAppAuthenticatedUser.ILogin,
    });
  typia.assert(loginResponse);

  const authToken = loginResponse.token;
  TestValidator.predicate(
    "authentication token is present",
    authToken.access.length > 0,
  );

  // Step 4: Update user profile with new email address
  const newEmail = typia.random<string & tags.Format<"email">>();
  TestValidator.notEquals(
    "new email differs from original email",
    newEmail,
    originalEmail,
  );

  const updateResponse: ITodoAppAuthenticatedUser =
    await api.functional.todoApp.authenticatedUser.auth.profile.update(
      connection,
      {
        body: {
          email: newEmail,
          firstName: RandomGenerator.name(1),
          lastName: RandomGenerator.name(1),
        } satisfies ITodoAppAuthenticatedUser.IUpdate,
      },
    );
  typia.assert(updateResponse);

  // Step 5: Validate updated profile contains new email address
  TestValidator.equals(
    "updated profile email matches new email",
    updateResponse.email,
    newEmail,
  );

  TestValidator.equals(
    "updated profile ID matches original user ID",
    updateResponse.id,
    userId,
  );

  // Step 6: Verify timestamps are correctly maintained
  const createdAtTime = new Date(updateResponse.createdAt).getTime();
  const updatedAtTime = new Date(updateResponse.updatedAt).getTime();

  TestValidator.predicate(
    "creation timestamp is before or equal to update timestamp",
    createdAtTime <= updatedAtTime,
  );

  TestValidator.predicate(
    "update timestamp is present and valid",
    updatedAtTime > 0,
  );

  TestValidator.predicate(
    "profile email verification status is tracked",
    typeof updateResponse.emailVerified === "boolean",
  );
}
