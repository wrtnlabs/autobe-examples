import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformNotificationSettings";
import type { IRedditPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPrivacySettings";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_user_settings_security_password_change(
  connection: api.IConnection,
) {
  // Generate random user credentials for testing
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const initialPassword: string = "SecurePass123!";
  const newPassword: string = "NewSecurePass456!";

  // 1. Create new registered user account
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: userEmail,
        password: initialPassword,
        display_name: RandomGenerator.name(),
        bio: "Test user for password change",
        location: "Seoul, Korea",
        href: "https://reddit-platform.test/login",
        referrer: "https://reddit-platform.test/",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // 2. Login with the new user to establish authentication session
  const authenticatedUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: userEmail,
        password: initialPassword,
        href: "https://reddit-platform.test/dashboard",
        referrer: "https://reddit-platform.test/login",
      } satisfies IRedditPlatformRegisteredUser.ILogin,
    });
  typia.assert(authenticatedUser);

  // 3. Update authentication settings with password change
  const updatedUser: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
      connection,
      {
        body: {
          password: initialPassword, // Current password verification
          new_password: newPassword, // New password to set
          display_name: RandomGenerator.name(),
          bio: "Updated test user profile",
          location: "Busan, Korea",
          website_url: "https://test-user.github.io",
          href: "https://reddit-platform.test/settings",
          referrer: "https://reddit-platform.test/profile",
        } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings,
      },
    );
  typia.assert(updatedUser);

  // 4. Verify password change by logging in with new password
  const reAuthenticatedUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: userEmail,
        password: newPassword,
        href: "https://reddit-platform.test/dashboard",
        referrer: "https://reddit-platform.test/login",
      } satisfies IRedditPlatformRegisteredUser.ILogin,
    });
  typia.assert(reAuthenticatedUser);

  // 5. Verify updated profile information is reflected
  TestValidator.equals(
    "display name should be updated",
    reAuthenticatedUser.displayName,
    updatedUser.displayName,
  );
  TestValidator.equals(
    "bio should be updated",
    reAuthenticatedUser.bio,
    updatedUser.bio,
  );
  TestValidator.equals(
    "location should be updated",
    reAuthenticatedUser.location,
    updatedUser.location,
  );
  TestValidator.equals(
    "website should be updated",
    reAuthenticatedUser.websiteUrl,
    updatedUser.websiteUrl,
  );

  // 6. Verify authentication tokens are different (new session established)
  TestValidator.notEquals(
    "new session token should be different",
    authenticatedUser.token.access,
    reAuthenticatedUser.token.access,
  );

  // 7. Test that old password no longer works
  await TestValidator.error("old password should be rejected", async () => {
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: userEmail,
        password: initialPassword, // Old password should fail
        href: "https://reddit-platform.test/login",
        referrer: "https://reddit-platform.test/",
      } satisfies IRedditPlatformRegisteredUser.ILogin,
    });
  });

  // 8. Test that password verification is required (wrong current password)
  await TestValidator.error(
    "incorrect current password should be rejected",
    async () => {
      await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
        connection,
        {
          body: {
            password: "WrongCurrentPassword123!", // Incorrect current password
            new_password: "AnotherPassword789!",
            href: "https://reddit-platform.test/settings",
            referrer: "https://reddit-platform.test/profile",
          } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings,
        },
      );
    },
  );

  // 9. Test password strength validation (too short)
  await TestValidator.error("weak password should be rejected", async () => {
    await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
      connection,
      {
        body: {
          password: newPassword, // Current password is correct
          new_password: "123", // Too short, should fail validation
          href: "https://reddit-platform.test/settings",
          referrer: "https://reddit-platform.test/profile",
        } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings,
      },
    );
  });
}
