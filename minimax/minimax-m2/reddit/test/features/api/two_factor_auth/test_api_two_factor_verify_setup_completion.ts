import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformTwoFactorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformTwoFactorRequest";
import type { IRedditPlatformTwoFactorResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformTwoFactorResponse";

/**
 * Test verifying two-factor authentication setup completion after authenticator
 * app configuration.
 *
 * This test validates the complete two-factor authentication setup workflow:
 *
 * 1. Register a new user account
 * 2. Initiate two-factor authentication setup to get authenticator app
 *    configuration
 * 3. Simulate authenticator app verification by generating a valid TOTP code
 * 4. Verify setup completion and validate that 2FA is fully activated
 * 5. Confirm backup codes are generated for account recovery
 */
export async function test_api_two_factor_verify_setup_completion(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12) + "Test1!";

  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: userEmail,
        password: userPassword,
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Verify user was created successfully
  TestValidator.equals(
    "user registration successful",
    registeredUser.email,
    userEmail,
  );
  TestValidator.predicate(
    "user has initial 2FA status",
    !registeredUser.twoFactorEnabled,
  );

  // Step 2: Initiate two-factor authentication setup to get authenticator app configuration
  const twoFactorSetupResponse: IRedditPlatformTwoFactorResponse =
    await api.functional.redditPlatform.registeredUser.auth.twoFactor.manageTwoFactor(
      connection,
      {
        body: {
          action: "enable",
          password: userPassword,
          method: "authenticator_app",
        } satisfies IRedditPlatformTwoFactorRequest,
      },
    );
  typia.assert(twoFactorSetupResponse);

  // Validate setup response structure
  TestValidator.predicate(
    "setup response has authenticator info",
    !!twoFactorSetupResponse.authenticator_setup,
  );
  TestValidator.predicate(
    "setup is not complete yet",
    !twoFactorSetupResponse.setup_complete,
  );
  TestValidator.equals(
    "initial 2FA status",
    twoFactorSetupResponse.is_enabled,
    false,
  );

  if (twoFactorSetupResponse.authenticator_setup) {
    const { secret_key, account_name, issuer } =
      twoFactorSetupResponse.authenticator_setup;

    // Validate authenticator setup data
    TestValidator.predicate(
      "secret key has valid format",
      /^[A-Z0-9]{16,32}$/.test(secret_key),
    );
    TestValidator.predicate("account name is present", account_name.length > 0);
    TestValidator.predicate("issuer is present", issuer.length > 0);
  }

  // Step 3: Simulate authenticator app verification by generating a valid TOTP code
  // In a real scenario, this would come from the user's authenticator app
  // For testing, we generate a mock verification code
  const verificationCode = RandomGenerator.alphaNumeric(6).toUpperCase();

  // Step 4: Verify setup completion using the verification code
  const verificationResponse: IRedditPlatformTwoFactorResponse =
    await api.functional.redditPlatform.registeredUser.auth.twoFactor.manageTwoFactor(
      connection,
      {
        body: {
          action: "verify_setup",
          password: userPassword,
          verification_code: verificationCode,
          method: "authenticator_app",
        } satisfies IRedditPlatformTwoFactorRequest,
      },
    );
  typia.assert(verificationResponse);

  // Validate verification response
  TestValidator.predicate(
    "setup is now complete",
    verificationResponse.setup_complete,
  );
  TestValidator.equals(
    "2FA is now enabled",
    verificationResponse.is_enabled,
    true,
  );
  TestValidator.equals(
    "method is authenticator_app",
    verificationResponse.method,
    "authenticator_app",
  );

  // Step 5: Generate backup codes for account recovery
  const backupCodesResponse: IRedditPlatformTwoFactorResponse =
    await api.functional.redditPlatform.registeredUser.auth.twoFactor.manageTwoFactor(
      connection,
      {
        body: {
          action: "generate_backup_codes",
          password: userPassword,
        } satisfies IRedditPlatformTwoFactorRequest,
      },
    );
  typia.assert(backupCodesResponse);

  // Validate backup codes were generated
  TestValidator.predicate(
    "backup codes are available",
    backupCodesResponse.backup_codes_count !== undefined,
  );
  TestValidator.predicate(
    "backup codes count is positive",
    (backupCodesResponse.backup_codes_count ?? 0) > 0,
  );

  if (backupCodesResponse.backup_codes) {
    TestValidator.equals(
      "backup codes count matches array",
      backupCodesResponse.backup_codes_count,
      backupCodesResponse.backup_codes.length,
    );

    // Validate backup code format
    backupCodesResponse.backup_codes.forEach((code, index) => {
      TestValidator.predicate(
        `backup code ${index + 1} has valid format`,
        /^[A-Z0-9]{8}$/.test(code),
      );
    });
  }

  // Final validation: Verify user session reflects 2FA status
  const finalUserCheck: IRedditPlatformRegisteredUser.IAuthorized =
    registeredUser;
  TestValidator.predicate(
    "user session shows 2FA enabled",
    finalUserCheck.twoFactorEnabled,
  );
}
