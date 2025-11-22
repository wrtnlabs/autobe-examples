import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformTwoFactorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformTwoFactorRequest";
import type { IRedditPlatformTwoFactorResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformTwoFactorResponse";

/**
 * Test two-factor authentication security validation when incorrect password is
 * provided.
 *
 * This test validates that the API properly enforces password verification
 * requirements for two-factor authentication operations. A registered user
 * attempts to enable 2FA with an invalid password, which should be rejected for
 * security. This ensures that unauthorized users cannot modify account security
 * settings without proper authentication.
 *
 * The test follows this workflow:
 *
 * 1. Create a new registered user account with valid credentials
 * 2. Attempt to enable two-factor authentication with an incorrect password
 * 3. Validate that the API rejects the unauthorized access attempt
 * 4. Confirm that security error handling works as expected
 *
 * This test is critical for ensuring that two-factor authentication settings
 * can only be modified by users who provide correct authentication
 * credentials.
 */
export async function test_api_two_factor_security_validation_error(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: userPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Attempt to enable 2FA with incorrect password - should fail
  await TestValidator.error(
    "incorrect password should be rejected for 2FA enable",
    async () => {
      await api.functional.redditPlatform.registeredUser.auth.twoFactor.manageTwoFactor(
        connection,
        {
          body: {
            action: "enable",
            password: "incorrect_wrong_password_123", // Deliberately wrong password
            method: "authenticator_app",
          } satisfies IRedditPlatformTwoFactorRequest,
        },
      );
    },
  );
}
