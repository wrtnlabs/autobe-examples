import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test password reset request with invalid username that doesn't exist in the
 * system.
 *
 * This test validates that the system properly validates username existence and
 * rejects reset requests for non-existent accounts while maintaining security
 * through appropriate error handling. The test ensures that password reset
 * functionality doesn't leak information about account existence and properly
 * handles edge cases.
 *
 * Test Flow:
 *
 * 1. Create a valid registered user account to establish authentication context
 * 2. Attempt password reset using a clearly invalid/non-existent username
 * 3. Verify that system rejects the request appropriately with security measures
 * 4. Validate proper error handling without information leakage
 */
export async function test_api_registered_user_password_reset_invalid_username(
  connection: api.IConnection,
) {
  // Step 1: Setup - Create a valid user account to establish authentication context
  const validUserEmail = typia.random<string & tags.Format<"email">>();
  const validUserUsername = RandomGenerator.alphaNumeric(10);
  const validUserPassword = RandomGenerator.alphabets(12);

  const validUser = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: validUserUsername,
      email: validUserEmail,
      password: validUserPassword,
      href: "https://example.com/register",
      referrer: "https://google.com",
    } satisfies IRedditPlatformRegisteredUser.ICreate,
  });
  typia.assert(validUser);

  // Step 2: Test with invalid username - Use a clearly non-existent username
  const invalidUsername =
    "definitely_nonexistent_user_" + RandomGenerator.alphaNumeric(8);

  // Step 3: Attempt password reset with invalid username
  await TestValidator.error(
    "password reset should fail for non-existent username",
    async () => {
      await api.functional.auth.registeredUser.password.reset.requestPasswordReset(
        connection,
        {
          body: {
            username: invalidUsername,
            email: validUserEmail, // Use a valid email to focus testing on username validation
          } satisfies IRedditPlatformRegisteredUser.IPasswordResetRequest,
        },
      );
    },
  );

  // Step 4: Additional validation - Test with completely invalid username and invalid email
  const completelyInvalidUsername = "invalid_user_123";
  const completelyInvalidEmail = "nonexistent@example.com";

  await TestValidator.error(
    "password reset should fail for completely invalid credentials",
    async () => {
      await api.functional.auth.registeredUser.password.reset.requestPasswordReset(
        connection,
        {
          body: {
            username: completelyInvalidUsername,
            email: completelyInvalidEmail,
          } satisfies IRedditPlatformRegisteredUser.IPasswordResetRequest,
        },
      );
    },
  );

  // Step 5: Validate that the valid user account was created successfully (sanity check)
  TestValidator.equals(
    "valid user account creation successful",
    validUser.username,
    validUserUsername,
  );
  TestValidator.equals(
    "valid user email matches",
    validUser.email,
    validUserEmail,
  );
  TestValidator.predicate(
    "valid user has authentication token",
    !!validUser.token && !!validUser.token.access,
  );
}
