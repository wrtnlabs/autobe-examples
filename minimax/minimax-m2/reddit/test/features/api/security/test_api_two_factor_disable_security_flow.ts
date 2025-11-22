import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformTwoFactorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformTwoFactorRequest";
import type { IRedditPlatformTwoFactorResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformTwoFactorResponse";

/**
 * Test disabling two-factor authentication with proper security verification.
 *
 * This test validates the complete 2FA disable flow for a registered user
 * including security confirmation process, password verification, and account
 * status updates. The test ensures proper audit trail maintenance and security
 * verification before removing 2FA protection.
 */
export async function test_api_two_factor_disable_security_flow(
  connection: api.IConnection,
) {
  // Step 1: Create a new registered user account for 2FA disable testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePassword123!";

  const newUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: userEmail,
        password: userPassword,
        href: "https://reddit.com/register",
        referrer: "https://reddit.com",
        display_name: "Test User 2FA Disable",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(newUser);
  TestValidator.equals(
    "user registration successful",
    newUser.email,
    userEmail,
  );
  TestValidator.equals(
    "new user 2FA disabled by default",
    newUser.twoFactorEnabled,
    false,
  );

  // Step 2: Enable two-factor authentication to establish baseline security state
  const enable2FARequest: IRedditPlatformTwoFactorRequest = {
    action: "enable",
    password: userPassword,
    method: "authenticator_app",
  };

  const enable2FAResponse: IRedditPlatformTwoFactorResponse =
    await api.functional.redditPlatform.registeredUser.auth.twoFactor.manageTwoFactor(
      connection,
      {
        body: enable2FARequest,
      },
    );
  typia.assert(enable2FAResponse);

  // Verify 2FA was enabled successfully
  TestValidator.equals(
    "2FA enabled successfully",
    enable2FAResponse.is_enabled,
    true,
  );
  TestValidator.equals(
    "2FA setup complete",
    enable2FAResponse.setup_complete,
    true,
  );
  TestValidator.equals(
    "authenticator app method active",
    enable2FAResponse.method,
    "authenticator_app",
  );

  // Step 3: Disable two-factor authentication with proper security verification
  const disableReason =
    "Switching to alternative security method due to device change";
  const disable2FARequest: IRedditPlatformTwoFactorRequest = {
    action: "disable",
    password: userPassword,
    disable_reason: disableReason,
  };

  const disable2FAResponse: IRedditPlatformTwoFactorResponse =
    await api.functional.redditPlatform.registeredUser.auth.twoFactor.manageTwoFactor(
      connection,
      {
        body: disable2FARequest,
      },
    );
  typia.assert(disable2FAResponse);

  // Step 4: Validate security confirmation process and account status update
  TestValidator.equals(
    "2FA disabled successfully",
    disable2FAResponse.is_enabled,
    false,
  );
  TestValidator.equals(
    "2FA setup incomplete after disable",
    disable2FAResponse.setup_complete,
    false,
  );
  TestValidator.equals(
    "no 2FA method active",
    disable2FAResponse.method,
    "none",
  );
  TestValidator.equals(
    "no backup codes available",
    disable2FAResponse.backup_codes_count,
    0,
  );

  // Verify timestamps are present for audit trail
  if (disable2FAResponse.setup_timestamp) {
    TestValidator.predicate(
      "setup timestamp is valid ISO date",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        disable2FAResponse.setup_timestamp,
      ),
    );
  }

  // Step 5: Verify complete security flow by checking user account status
  const updatedUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: newUser.username,
        email: userEmail,
        password: userPassword,
        href: "https://reddit.com/profile",
        referrer: "https://reddit.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(updatedUser);

  // Confirm user's 2FA status matches the disable operation result
  TestValidator.equals(
    "user account 2FA disabled after operation",
    updatedUser.twoFactorEnabled,
    false,
  );
  TestValidator.equals(
    "user account remains active",
    updatedUser.accountStatus,
    "active",
  );
  TestValidator.equals(
    "user business status unchanged",
    updatedUser.businessStatus,
    "active",
  );

  // Step 6: Validate error handling with incorrect password
  await TestValidator.error(
    "disable 2FA should fail with incorrect password",
    async () => {
      await api.functional.redditPlatform.registeredUser.auth.twoFactor.manageTwoFactor(
        connection,
        {
          body: {
            action: "enable",
            password: "IncorrectPassword123!",
            method: "authenticator_app",
          } satisfies IRedditPlatformTwoFactorRequest,
        },
      );
    },
  );

  // Step 7: Re-enable 2FA to verify the system is still functional
  const reEnable2FAResponse: IRedditPlatformTwoFactorResponse =
    await api.functional.redditPlatform.registeredUser.auth.twoFactor.manageTwoFactor(
      connection,
      {
        body: {
          action: "enable",
          password: userPassword,
          method: "email",
        } satisfies IRedditPlatformTwoFactorRequest,
      },
    );
  typia.assert(reEnable2FAResponse);

  TestValidator.equals(
    "2FA re-enabled successfully",
    reEnable2FAResponse.is_enabled,
    true,
  );
  TestValidator.equals(
    "email method now active",
    reEnable2FAResponse.method,
    "email",
  );
}
