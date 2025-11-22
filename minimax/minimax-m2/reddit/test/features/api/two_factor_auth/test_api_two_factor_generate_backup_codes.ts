import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformTwoFactorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformTwoFactorRequest";
import type { IRedditPlatformTwoFactorResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformTwoFactorResponse";

/**
 * Test generating new backup codes for account recovery when 2FA is enabled.
 *
 * This test validates the backup code regeneration process and security
 * measures by:
 *
 * 1. Creating a new registered user account for testing
 * 2. Enabling two-factor authentication with proper setup
 * 3. Generating fresh backup codes through the 2FA management endpoint
 * 4. Validating that new backup codes are created and old codes are invalidated
 * 5. Ensuring the backup codes follow the expected format and security constraints
 *
 * The test ensures that registered users with active 2FA can successfully
 * request new backup codes for emergency access, and that the system properly
 * handles the code regeneration process with appropriate security measures.
 */
export async function test_api_two_factor_generate_backup_codes(
  connection: api.IConnection,
) {
  // Step 1: Create a new registered user account for backup code testing
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = "SecurePassword123!";

  const newUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: userEmail,
        password: userPassword,
        display_name: RandomGenerator.name(),
        bio: "Test user for 2FA backup code generation",
        location: "Seoul, South Korea",
        website_url: "https://example.com",
        href: "https://test.example.com/join",
        referrer: "https://test.example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(newUser);

  TestValidator.equals(
    "user account created successfully",
    newUser.email,
    userEmail,
  );
  TestValidator.equals(
    "user account should be active",
    newUser.accountStatus,
    "active",
  );
  TestValidator.equals(
    "user should not have 2FA initially enabled",
    newUser.twoFactorEnabled,
    false,
  );

  // Step 2: Enable two-factor authentication first before generating backup codes
  // First, enable 2FA with authenticator app method
  const enableTwoFactorRequest: IRedditPlatformTwoFactorRequest = {
    action: "enable",
    password: userPassword,
    method: "authenticator_app",
  };

  const enableResponse: IRedditPlatformTwoFactorResponse =
    await api.functional.redditPlatform.registeredUser.auth.twoFactor.manageTwoFactor(
      connection,
      {
        body: enableTwoFactorRequest,
      },
    );
  typia.assert(enableResponse);

  TestValidator.equals(
    "2FA should be enabled",
    enableResponse.is_enabled,
    true,
  );
  TestValidator.equals(
    "setup should be complete",
    enableResponse.setup_complete,
    true,
  );
  TestValidator.equals(
    "method should be authenticator app",
    enableResponse.method,
    "authenticator_app",
  );

  // Step 3: Generate fresh backup codes for the user
  const generateBackupCodesRequest: IRedditPlatformTwoFactorRequest = {
    action: "generate_backup_codes",
    password: userPassword,
  };

  const backupCodesResponse: IRedditPlatformTwoFactorResponse =
    await api.functional.redditPlatform.registeredUser.auth.twoFactor.manageTwoFactor(
      connection,
      {
        body: generateBackupCodesRequest,
      },
    );
  typia.assert(backupCodesResponse);

  // Step 4: Validate backup codes generation response
  TestValidator.equals(
    "2FA should remain enabled",
    backupCodesResponse.is_enabled,
    true,
  );
  TestValidator.equals(
    "setup should remain complete",
    backupCodesResponse.setup_complete,
    true,
  );
  TestValidator.equals(
    "method should still be authenticator app",
    backupCodesResponse.method,
    "authenticator_app",
  );

  // Validate backup codes are present and properly formatted
  TestValidator.predicate(
    "backup codes should be provided",
    backupCodesResponse.backup_codes !== undefined &&
      backupCodesResponse.backup_codes !== null &&
      backupCodesResponse.backup_codes.length > 0,
  );

  TestValidator.equals(
    "backup codes count should be provided",
    backupCodesResponse.backup_codes_count !== undefined,
    true,
  );

  if (backupCodesResponse.backup_codes) {
    // Validate each backup code format (8-character alphanumeric)
    for (let i = 0; i < backupCodesResponse.backup_codes.length; i++) {
      const code = backupCodesResponse.backup_codes[i];
      TestValidator.equals(
        `backup code ${i + 1} should be 8 characters`,
        code.length,
        8,
      );
      TestValidator.predicate(
        `backup code ${i + 1} should be alphanumeric`,
        /^[A-Z0-9]{8}$/.test(code),
      );
    }

    // Validate backup codes are unique
    const uniqueCodes = new Set(backupCodesResponse.backup_codes);
    TestValidator.equals(
      "all backup codes should be unique",
      uniqueCodes.size,
      backupCodesResponse.backup_codes.length,
    );

    // Validate backup codes count matches the array length
    if (backupCodesResponse.backup_codes_count !== undefined) {
      TestValidator.equals(
        "backup codes count should match array length",
        backupCodesResponse.backup_codes_count,
        backupCodesResponse.backup_codes.length,
      );
    }
  }

  // Step 5: Generate backup codes again to test regeneration (should invalidate old codes)
  const regenerateBackupCodesRequest: IRedditPlatformTwoFactorRequest = {
    action: "generate_backup_codes",
    password: userPassword,
  };

  const regeneratedResponse: IRedditPlatformTwoFactorResponse =
    await api.functional.redditPlatform.registeredUser.auth.twoFactor.manageTwoFactor(
      connection,
      {
        body: regenerateBackupCodesRequest,
      },
    );
  typia.assert(regeneratedResponse);

  // Step 6: Validate backup code regeneration
  TestValidator.equals(
    "2FA should still be enabled",
    regeneratedResponse.is_enabled,
    true,
  );
  TestValidator.equals(
    "setup should remain complete",
    regeneratedResponse.setup_complete,
    true,
  );
  TestValidator.equals(
    "method should still be authenticator app",
    regeneratedResponse.method,
    "authenticator_app",
  );

  if (regeneratedResponse.backup_codes && backupCodesResponse.backup_codes) {
    // Validate new backup codes are different from old ones (old codes should be invalidated)
    const oldCodesSet = new Set(backupCodesResponse.backup_codes);
    const newCodesSet = new Set(regeneratedResponse.backup_codes);

    let codesChanged = false;
    for (const newCode of regeneratedResponse.backup_codes) {
      if (!oldCodesSet.has(newCode)) {
        codesChanged = true;
        break;
      }
    }

    TestValidator.predicate(
      "new backup codes should be different from old codes",
      codesChanged,
    );

    // Validate regenerated codes are also properly formatted
    for (let i = 0; i < regeneratedResponse.backup_codes.length; i++) {
      const code = regeneratedResponse.backup_codes[i];
      TestValidator.equals(
        `regenerated backup code ${i + 1} should be 8 characters`,
        code.length,
        8,
      );
      TestValidator.predicate(
        `regenerated backup code ${i + 1} should be alphanumeric`,
        /^[A-Z0-9]{8}$/.test(code),
      );
    }

    // Validate regenerated codes count is consistent
    if (
      regeneratedResponse.backup_codes_count !== undefined &&
      backupCodesResponse.backup_codes_count !== undefined
    ) {
      TestValidator.equals(
        "regenerated backup codes count should be consistent",
        regeneratedResponse.backup_codes_count,
        backupCodesResponse.backup_codes_count,
      );
    }
  }

  // Step 7: Verify user account status after backup code operations
  const finalUserCheck: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: newUser.username,
        email: userEmail,
        password: userPassword,
        href: "https://test.example.com/check",
        referrer: "https://test.example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(finalUserCheck);

  TestValidator.equals(
    "user 2FA should remain enabled",
    finalUserCheck.twoFactorEnabled,
    true,
  );
  TestValidator.equals(
    "user account should remain active",
    finalUserCheck.accountStatus,
    "active",
  );
  TestValidator.equals(
    "user email should remain the same",
    finalUserCheck.email,
    userEmail,
  );

  // Step 8: Test security - attempt to generate backup codes with wrong password (should fail)
  await TestValidator.error(
    "generating backup codes with wrong password should fail",
    async () => {
      await api.functional.redditPlatform.registeredUser.auth.twoFactor.manageTwoFactor(
        connection,
        {
          body: {
            action: "generate_backup_codes",
            password: "WrongPassword123!",
          } satisfies IRedditPlatformTwoFactorRequest,
        },
      );
    },
  );
}
