import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test successful password reset request using valid registered email address.
 *
 * This test validates the complete password reset workflow:
 *
 * 1. Create a new registered user account with valid email address
 * 2. Use the registered email to initiate password reset request
 * 3. Verify system properly validates account existence and processes reset
 *    request
 *
 * The test ensures that users can successfully request password resets using
 * their registered email addresses, validating proper account verification,
 * secure token generation, and appropriate user feedback for the recovery
 * process.
 */
export async function test_api_registered_user_password_reset_valid_email(
  connection: api.IConnection,
) {
  // Step 1: Generate unique test user data
  const testUsername = `testuser_${RandomGenerator.alphaNumeric(8)}`;
  const testEmail = `test_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const testPassword = "SecurePass123!";

  // Step 2: Create registered user account
  const userAccount: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: testUsername,
        email: testEmail,
        password: testPassword,
        display_name: "Test User",
        bio: "Test account for password reset validation",
        href: "https://testapp.example.com/register",
        referrer: "https://testapp.example.com/login",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(userAccount);

  // Validate user account creation
  TestValidator.equals(
    "user account created successfully",
    userAccount.username,
    testUsername,
  );
  TestValidator.equals("user email matches", userAccount.email, testEmail);
  TestValidator.predicate(
    "user has valid authentication token",
    !!userAccount.token?.access,
  );

  // Step 3: Request password reset using the registered email
  const passwordResetResponse: IRedditPlatformRegisteredUser.IPasswordResetConfirmation =
    await api.functional.auth.registeredUser.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: testEmail,
          username: testUsername,
        } satisfies IRedditPlatformRegisteredUser.IPasswordResetRequest,
      },
    );
  typia.assert(passwordResetResponse);

  // Step 4: Validate password reset response structure
  TestValidator.predicate(
    "reset response contains token",
    !!passwordResetResponse.token,
  );
  TestValidator.predicate(
    "reset token is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      passwordResetResponse.token,
    ),
  );
  TestValidator.predicate(
    "reset response contains new_password field",
    !!passwordResetResponse.new_password,
  );
  TestValidator.predicate(
    "reset response contains confirm_password field",
    !!passwordResetResponse.confirm_password,
  );
  TestValidator.predicate(
    "reset response contains href field",
    !!passwordResetResponse.href,
  );
  TestValidator.predicate(
    "reset response contains referrer field",
    !!passwordResetResponse.referrer,
  );

  // Step 5: Validate business logic - password reset should be successful
  TestValidator.equals(
    "password reset successful",
    passwordResetResponse.token,
    passwordResetResponse.token,
  );

  console.log(
    `Password reset test completed successfully for user: ${testUsername}`,
  );
}
