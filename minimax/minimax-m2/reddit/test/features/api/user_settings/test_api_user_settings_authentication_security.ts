import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformNotificationSettings";
import type { IRedditPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPrivacySettings";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_user_settings_authentication_security(
  connection: api.IConnection,
) {
  // 1. Create registered user account
  const username = `testuser_${RandomGenerator.alphaNumeric(8)}`;
  const email = `${username}@example.com`;
  const password = "TestPassword123!";

  const createdUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username,
        email,
        password,
        display_name: "Test User",
        bio: "Test user for authentication settings validation",
        location: "Test City, TC",
        website_url: "https://testuser.example.com",
        avatar_url: "https://example.com/avatar.jpg",
        href: "https://reddit.test/register",
        referrer: "https://reddit.test/",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(createdUser);

  TestValidator.equals(
    "user account created successfully",
    createdUser.username,
    username,
  );
  TestValidator.equals(
    "email verified status",
    createdUser.emailVerified,
    false,
  );
  TestValidator.equals(
    "two-factor authentication disabled",
    createdUser.twoFactorEnabled,
    false,
  );

  // 2. Login to authenticate user
  const authenticatedUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email,
        password,
        href: "https://reddit.test/login",
        referrer: "https://reddit.test/",
      } satisfies IRedditPlatformRegisteredUser.ILogin,
    });
  typia.assert(authenticatedUser);

  TestValidator.equals(
    "login successful",
    authenticatedUser.username,
    username,
  );
  TestValidator.equals(
    "login count incremented",
    authenticatedUser.loginCount,
    1,
  );
  TestValidator.equals(
    "failed login attempts reset",
    authenticatedUser.failedLoginAttempts,
    0,
  );

  // 3. Update authentication settings with comprehensive security configuration
  const updatedUser: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
      connection,
      {
        body: {
          display_name: "Secure Test User",
          bio: "Updated bio with enhanced security settings",
          location: "Secure Location, SL",
          website_url: "https://secure-user.example.com",
          avatar_url: "https://secure.example.com/new-avatar.jpg",
          password,
          two_factor_enabled: true,
          privacy_settings: {
            profile_visibility: "registered_users",
            show_activity: true,
            allow_mentions: true,
            show_karma: true,
            show_online_status: false,
            share_location: true,
          } satisfies IRedditPlatformPrivacySettings,
          notification_preferences: {
            email_notifications: true,
            push_notifications: false,
            comment_replies: true,
            post_replies: true,
            mentions: true,
            community_updates: false,
            digest_frequency: "weekly",
          } satisfies IRedditPlatformNotificationSettings,
          href: "https://reddit.test/settings/security",
          referrer: "https://reddit.test/settings",
        } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings,
      },
    );
  typia.assert(updatedUser);

  // 4. Validate settings update success
  TestValidator.equals(
    "display name updated",
    updatedUser.displayName,
    "Secure Test User",
  );
  TestValidator.equals(
    "bio updated",
    updatedUser.bio,
    "Updated bio with enhanced security settings",
  );
  TestValidator.equals(
    "location updated",
    updatedUser.location,
    "Secure Location, SL",
  );
  TestValidator.equals(
    "website updated",
    updatedUser.websiteUrl,
    "https://secure-user.example.com",
  );
  TestValidator.equals(
    "avatar updated",
    updatedUser.avatarUrl,
    "https://secure.example.com/new-avatar.jpg",
  );
  TestValidator.equals(
    "two-factor authentication enabled",
    updatedUser.twoFactorEnabled,
    true,
  );

  // 5. Test password change functionality
  const newPassword = "NewSecurePassword456!";
  const passwordUpdatedUser: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
      connection,
      {
        body: {
          password,
          new_password: newPassword,
          display_name: updatedUser.displayName,
          href: "https://reddit.test/settings/security",
          referrer: "https://reddit.test/settings",
        } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings,
      },
    );
  typia.assert(passwordUpdatedUser);

  TestValidator.equals(
    "password change successful",
    passwordUpdatedUser.displayName,
    "Secure Test User",
  );

  // 6. Test login with new password to verify password change
  const reAuthenticatedUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email,
        password: newPassword,
        href: "https://reddit.test/login",
        referrer: "https://reddit.test/settings",
      } satisfies IRedditPlatformRegisteredUser.ILogin,
    });
  typia.assert(reAuthenticatedUser);

  TestValidator.equals(
    "login with new password successful",
    reAuthenticatedUser.username,
    username,
  );
  TestValidator.equals(
    "login count incremented after password change",
    reAuthenticatedUser.loginCount,
    2,
  );

  // 7. Update settings with minimal changes to test partial updates
  const partiallyUpdatedUser: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
      connection,
      {
        body: {
          bio: "Final test bio update",
          password: newPassword,
          href: "https://reddit.test/settings/security",
          referrer: "https://reddit.test/settings",
        } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings,
      },
    );
  typia.assert(partiallyUpdatedUser);

  TestValidator.equals(
    "partial bio update successful",
    partiallyUpdatedUser.bio,
    "Final test bio update",
  );
  TestValidator.equals(
    "display name preserved",
    partiallyUpdatedUser.displayName,
    "Secure Test User",
  );
  TestValidator.equals(
    "two-factor authentication maintained",
    partiallyUpdatedUser.twoFactorEnabled,
    true,
  );
}
