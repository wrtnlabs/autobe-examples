import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformTwoFactorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformTwoFactorRequest";
import type { IRedditPlatformTwoFactorResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformTwoFactorResponse";

export async function test_api_two_factor_verification_success_authenticator(
  connection: api.IConnection,
) {
  // Step 1: Create a new registered user account
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(12);
  const userUsername: string = RandomGenerator.alphaNumeric(8);

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: userUsername,
        email: userEmail,
        password: userPassword,
        href: "https://example.com/register",
        referrer: "https://example.com/login",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);
  TestValidator.equals("user created successfully", user.email, userEmail);
  TestValidator.equals(
    "user should not have 2FA enabled initially",
    user.twoFactorEnabled,
    false,
  );

  // Step 2: Enable two-factor authentication setup
  const twoFactorSetup: IRedditPlatformTwoFactorResponse =
    await api.functional.redditPlatform.registeredUser.auth.twoFactor.manageTwoFactor(
      connection,
      {
        body: {
          action: "enable",
          password: userPassword,
          method: "authenticator_app",
          verification_code: "123456",
        } satisfies IRedditPlatformTwoFactorRequest,
      },
    );
  typia.assert(twoFactorSetup);
  TestValidator.equals(
    "2FA setup should be prepared",
    twoFactorSetup.setup_complete,
    false,
  );

  // Step 3: Verify two-factor authentication with valid TOTP code
  const verificationResult: IRedditPlatformRegisteredUser.ITwoFactorVerificationResult =
    await api.functional.redditPlatform.registeredUser.auth.twoFactor.verify.twoFactorVerify(
      connection,
      {
        body: {
          verification_code: "123456",
          confirm_activation: true,
        } satisfies IRedditPlatformRegisteredUser.ITwoFactorVerification,
      },
    );
  typia.assert(verificationResult);
  TestValidator.equals(
    "verification should be successful",
    verificationResult.verification_successful,
    true,
  );
  TestValidator.equals(
    "2FA should be enabled",
    verificationResult.two_factor_enabled,
    true,
  );
  TestValidator.equals(
    "account should be active",
    verificationResult.account_status,
    "active",
  );
  TestValidator.equals(
    "security should be enhanced",
    verificationResult.security_enhanced,
    true,
  );
  TestValidator.predicate(
    "backup codes should be generated",
    verificationResult.backup_codes_generated !== null &&
      verificationResult.backup_codes_generated !== undefined &&
      verificationResult.backup_codes_generated > 0,
  );
}
