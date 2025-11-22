import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_user_profile_update_security_settings(
  connection: api.IConnection,
) {
  // Create a new registered user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePass123!";

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `testuser_${RandomGenerator.alphaNumeric(8)}`,
        email: userEmail,
        password: userPassword,
        display_name: "Test Security User",
        bio: "Testing security features",
        href: "https://example.com/register",
        referrer: "https://google.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Verify initial security settings
  TestValidator.equals(
    "initial two-factor status",
    user.twoFactorEnabled,
    false,
  );
  TestValidator.equals(
    "initial email verified status",
    user.emailVerified,
    false,
  );

  // Update security settings - enable two-factor authentication
  const updatedUser: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {
          two_factor_enabled: true,
          email_verified: false, // Keep email unverified for testing
        } satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  typia.assert(updatedUser);

  // Validate security settings were updated
  TestValidator.equals(
    "two-factor should be enabled",
    updatedUser.twoFactorEnabled,
    true,
  );
  TestValidator.equals(
    "email verified status unchanged",
    updatedUser.emailVerified,
    false,
  );

  // Test disabling two-factor authentication
  const disableTwoFactor: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {
          two_factor_enabled: false,
        } satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  typia.assert(disableTwoFactor);

  // Verify two-factor was disabled
  TestValidator.equals(
    "two-factor should be disabled",
    disableTwoFactor.twoFactorEnabled,
    false,
  );
  TestValidator.equals(
    "email verified status still false",
    disableTwoFactor.emailVerified,
    false,
  );

  // Test updating email verification status
  const verifyEmail: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {
          email_verified: true,
        } satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  typia.assert(verifyEmail);

  // Validate email verification was updated
  TestValidator.equals(
    "email should now be verified",
    verifyEmail.emailVerified,
    true,
  );
  TestValidator.equals(
    "two-factor status unchanged",
    verifyEmail.twoFactorEnabled,
    false,
  );

  // Test multiple security updates in one request
  const multipleUpdates: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {
          two_factor_enabled: true,
          email_verified: true,
          bio: "Updated bio with security features",
        } satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  typia.assert(multipleUpdates);

  // Verify all updates were applied
  TestValidator.equals(
    "both security features enabled",
    multipleUpdates.twoFactorEnabled && multipleUpdates.emailVerified,
    true,
  );
  TestValidator.equals(
    "bio was also updated",
    multipleUpdates.bio,
    "Updated bio with security features",
  );

  // Test that security changes persist by re-fetching user data
  const finalUser: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {
          bio: "Final verification of security settings",
        } satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  typia.assert(finalUser);

  // Verify security settings persisted
  TestValidator.equals(
    "two-factor remains enabled",
    finalUser.twoFactorEnabled,
    true,
  );
  TestValidator.equals(
    "email verification remains true",
    finalUser.emailVerified,
    true,
  );
}
