import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformTwoFactorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformTwoFactorRequest";
import type { IRedditPlatformTwoFactorResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformTwoFactorResponse";

export async function test_api_two_factor_authenticator_app_enable(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePassword123!";

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.name(2).replace(/\s+/g, "_").toLowerCase(),
        email: userEmail,
        password: userPassword,
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Validate user creation
  TestValidator.equals(
    "user created successfully",
    user.username !== undefined,
    true,
  );
  TestValidator.equals("user email verified", user.emailVerified, false);

  // Step 2: Enable two-factor authentication with authenticator app method
  const twoFactorResponse: IRedditPlatformTwoFactorResponse =
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
  typia.assert(twoFactorResponse);

  // Step 3: Validate two-factor authentication setup response
  TestValidator.equals(
    "two-factor authentication enabled",
    twoFactorResponse.is_enabled,
    true,
  );
  TestValidator.equals(
    "setup completed",
    twoFactorResponse.setup_complete,
    true,
  );
  TestValidator.equals(
    "authenticator app method active",
    twoFactorResponse.method,
    "authenticator_app",
  );
  TestValidator.equals(
    "backup codes generated",
    twoFactorResponse.backup_codes_count !== undefined,
    true,
  );
  TestValidator.equals(
    "backup codes list provided",
    twoFactorResponse.backup_codes !== undefined,
    true,
  );
  TestValidator.equals(
    "authenticator setup info present",
    twoFactorResponse.authenticator_setup !== undefined,
    true,
  );
  TestValidator.equals(
    "qr code URL present",
    twoFactorResponse.authenticator_setup?.qr_code_url !== undefined,
    true,
  );
  TestValidator.equals(
    "secret key provided",
    twoFactorResponse.authenticator_setup?.secret_key !== undefined,
    true,
  );
  TestValidator.equals(
    "account name configured",
    twoFactorResponse.authenticator_setup?.account_name !== undefined,
    true,
  );
  TestValidator.equals(
    "issuer identified",
    twoFactorResponse.authenticator_setup?.issuer !== undefined,
    true,
  );
  TestValidator.equals(
    "setup timestamp recorded",
    twoFactorResponse.setup_timestamp !== undefined,
    true,
  );

  // Step 4: Validate backup codes structure and content
  if (twoFactorResponse.backup_codes) {
    TestValidator.predicate(
      "backup codes are alphanumeric",
      twoFactorResponse.backup_codes.every((code) =>
        /^[A-Z0-9]{8}$/.test(code),
      ),
    );
    TestValidator.equals(
      "backup codes count matches list",
      twoFactorResponse.backup_codes_count,
      twoFactorResponse.backup_codes.length,
    );
  }

  // Step 5: Validate authenticator setup information
  if (twoFactorResponse.authenticator_setup) {
    const setup = twoFactorResponse.authenticator_setup;
    TestValidator.predicate(
      "qr code is valid URI",
      /^https?:\/\/.+/.test(setup.qr_code_url),
    );
    TestValidator.predicate(
      "secret key matches pattern",
      /^[A-Z0-9]{16,32}$/.test(setup.secret_key),
    );
    TestValidator.equals(
      "account name contains username",
      setup.account_name.includes(user.username),
      true,
    );
    TestValidator.equals("issuer is Reddit", setup.issuer, "Reddit");
  }

  // Step 6: Validate security timestamps
  if (twoFactorResponse.setup_timestamp) {
    const setupTime = new Date(twoFactorResponse.setup_timestamp);
    const now = new Date();
    TestValidator.predicate(
      "setup timestamp is recent",
      now.getTime() - setupTime.getTime() < 60000, // Within last minute
    );
  }
}
