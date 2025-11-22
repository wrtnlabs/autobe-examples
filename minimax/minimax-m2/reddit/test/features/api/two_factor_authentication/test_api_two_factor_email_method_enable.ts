import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformTwoFactorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformTwoFactorRequest";
import type { IRedditPlatformTwoFactorResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformTwoFactorResponse";

/**
 * Test enabling two-factor authentication using email verification method.
 *
 * This test validates the complete email-based 2FA setup process:
 *
 * 1. Create a new registered user account with valid credentials
 * 2. Enable email-based two-factor authentication with password verification
 * 3. Validate email verification setup process and configuration
 * 4. Confirm backup code generation for account recovery scenarios
 * 5. Verify proper security workflow and user experience
 *
 * The test ensures registered users can successfully secure their accounts with
 * email-based two-factor authentication and have proper recovery options.
 */
export async function test_api_two_factor_email_method_enable(
  connection: api.IConnection,
) {
  // Step 1: Generate unique test user credentials for registration
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testUsername = RandomGenerator.alphaNumeric(8);
  const testPassword = RandomGenerator.alphaNumeric(16);

  // Step 2: Register new user account with required credentials
  const registeredUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: testUsername,
        email: testEmail,
        password: testPassword,
        href: "https://test.example.com/registration",
        referrer: "https://test.example.com/",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );
  typia.assert(registeredUser);

  // Step 3: Validate user registration was successful
  TestValidator.equals(
    "user registration succeeds",
    registeredUser.email,
    testEmail,
  );
  TestValidator.predicate(
    "user has valid authorization token",
    registeredUser.token.access.length > 0 &&
      registeredUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "initial 2FA status is disabled",
    registeredUser.twoFactorEnabled === false,
  );

  // Step 4: Enable email-based two-factor authentication with password verification
  const twoFactorResponse =
    await api.functional.redditPlatform.registeredUser.auth.twoFactor.manageTwoFactor(
      connection,
      {
        body: {
          action: "enable",
          password: testPassword,
          method: "email",
          email_address: testEmail,
        } satisfies IRedditPlatformTwoFactorRequest,
      },
    );
  typia.assert(twoFactorResponse);

  // Step 5: Validate two-factor authentication setup response
  TestValidator.predicate(
    "2FA is enabled after setup",
    twoFactorResponse.is_enabled === true,
  );
  TestValidator.equals(
    "email method is configured",
    twoFactorResponse.method,
    "email",
  );
  TestValidator.predicate(
    "setup process is complete",
    twoFactorResponse.setup_complete === true,
  );

  // Step 6: Validate backup code generation for account recovery
  TestValidator.predicate(
    "backup codes are generated",
    twoFactorResponse.backup_codes_count !== undefined &&
      twoFactorResponse.backup_codes_count > 0,
  );
  TestValidator.predicate(
    "backup codes are available",
    twoFactorResponse.backup_codes !== undefined &&
      twoFactorResponse.backup_codes.length > 0,
  );

  // Step 7: Validate backup code format and structure
  if (
    twoFactorResponse.backup_codes &&
    twoFactorResponse.backup_codes.length > 0
  ) {
    const backupCode = twoFactorResponse.backup_codes[0];
    TestValidator.predicate(
      "backup code format is valid",
      /^[A-Z0-9]{8}$/.test(backupCode),
    );
  }

  // Step 8: Verify setup timestamp is recorded for audit purposes
  TestValidator.predicate(
    "setup timestamp is recorded",
    twoFactorResponse.setup_timestamp !== undefined,
  );

  // Step 9: Test business logic - verify security enhancement
  TestValidator.predicate(
    "user account security is enhanced",
    twoFactorResponse.is_enabled && twoFactorResponse.setup_complete,
  );

  // Step 10: Validate that recovery instructions are provided
  if (twoFactorResponse.recovery_instructions) {
    TestValidator.predicate(
      "recovery instructions are provided",
      twoFactorResponse.recovery_instructions.length > 0,
    );
  }

  // Step 11: Verify verification instructions for user guidance
  if (twoFactorResponse.verification_instructions) {
    TestValidator.predicate(
      "verification instructions are provided",
      twoFactorResponse.verification_instructions.length > 0,
    );
  }

  // Step 12: Test security workflow completeness
  TestValidator.predicate(
    "complete 2FA workflow is functional",
    twoFactorResponse.is_enabled &&
      twoFactorResponse.setup_complete &&
      twoFactorResponse.method === "email" &&
      (twoFactorResponse.backup_codes_count ?? 0) > 0,
  );
}
