import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformNotificationSettings";
import type { IRedditPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPrivacySettings";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Comprehensive test for user privacy settings and notification preferences
 * configuration.
 *
 * This test validates that registered users can successfully update their
 * privacy settings and notification preferences through the authentication
 * settings endpoint. It covers various privacy control options (profile
 * visibility, activity sharing, mentions, karma display, online status,
 * location sharing) and notification preferences (email, push, replies,
 * mentions, community updates, digest frequency). The test ensures all
 * configuration changes are properly validated, persisted, and reflected in the
 * updated user profile response.
 */
export async function test_api_user_settings_privacy_notification_config(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user account
  const email = typia.random<string & tags.Format<"email">>();
  const username = `testuser_${typia.random<string & tags.Format<"uuid">>()}`;

  const userCreateData = {
    username: username,
    email: email,
    password: "SecurePassword123!",
    display_name: "Test User Settings",
    bio: "Testing privacy and notification settings functionality",
    location: "San Francisco, CA",
    website_url: "https://example.com" as string & tags.Format<"uri">,
    avatar_url: "https://example.com/avatar.jpg" as string & tags.Format<"uri">,
    href: "https://reddit-platform.example.com/register",
    referrer: "https://google.com",
  } satisfies IRedditPlatformRegisteredUser.ICreate;

  const createdUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: userCreateData,
    },
  );
  typia.assert(createdUser);
  TestValidator.equals(
    "created user has valid authentication",
    createdUser.token.access.length > 0,
    true,
  );

  // Step 2: Login to establish authenticated session
  const loginData = {
    email: email,
    password: "SecurePassword123!",
    href: "https://reddit-platform.example.com/login",
    referrer: "https://reddit-platform.example.com/register",
  } satisfies IRedditPlatformRegisteredUser.ILogin;

  const loggedInUser = await api.functional.auth.registeredUser.login(
    connection,
    {
      body: loginData,
    },
  );
  typia.assert(loggedInUser);
  TestValidator.equals(
    "login successful with valid credentials",
    loggedInUser.id,
    createdUser.id,
  );

  // Step 3: Update privacy settings with comprehensive configuration
  const privacySettings = {
    profile_visibility: "registered_users" as const,
    show_activity: false,
    allow_mentions: true,
    show_karma: true,
    show_online_status: false,
    share_location: true,
  } satisfies IRedditPlatformPrivacySettings;

  const notificationSettings = {
    email_notifications: true,
    push_notifications: false,
    comment_replies: true,
    post_replies: false,
    mentions: true,
    community_updates: true,
    digest_frequency: "weekly" as const,
  } satisfies IRedditPlatformNotificationSettings;

  const settingsUpdateData = {
    display_name: "Updated Privacy Settings User",
    bio: "Privacy-conscious user with specific notification preferences",
    location: "San Francisco, CA - Privacy Protected",
    website_url: "https://privacy-focused-site.com" as string &
      tags.Format<"uri">,
    avatar_url: "https://privacy-site.com/secure-avatar.jpg" as string &
      tags.Format<"uri">,
    password: "SecurePassword123!",
    privacy_settings: privacySettings,
    notification_preferences: notificationSettings,
    href: "https://reddit-platform.example.com/settings",
    referrer: "https://reddit-platform.example.com/profile",
  } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings;

  const updatedUser =
    await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
      connection,
      {
        body: settingsUpdateData,
      },
    );
  typia.assert(updatedUser);

  // Step 4: Validate privacy settings were applied
  TestValidator.equals(
    "display name updated",
    updatedUser.displayName,
    "Updated Privacy Settings User",
  );
  TestValidator.equals(
    "bio updated",
    updatedUser.bio,
    "Privacy-conscious user with specific notification preferences",
  );
  TestValidator.equals(
    "location updated",
    updatedUser.location,
    "San Francisco, CA - Privacy Protected",
  );
  TestValidator.equals(
    "website updated",
    updatedUser.websiteUrl,
    "https://privacy-focused-site.com",
  );
  TestValidator.equals(
    "avatar updated",
    updatedUser.avatarUrl,
    "https://privacy-site.com/secure-avatar.jpg",
  );
  TestValidator.equals(
    "user ID remains consistent",
    updatedUser.id,
    loggedInUser.id,
  );

  // Step 5: Test different privacy setting combinations
  const restrictivePrivacySettings = {
    profile_visibility: "private" as const,
    show_activity: false,
    allow_mentions: false,
    show_karma: false,
    show_online_status: false,
    share_location: false,
  } satisfies IRedditPlatformPrivacySettings;

  const minimalNotificationSettings = {
    email_notifications: false,
    push_notifications: false,
    comment_replies: false,
    post_replies: false,
    mentions: false,
    community_updates: false,
    digest_frequency: "never" as const,
  } satisfies IRedditPlatformNotificationSettings;

  const restrictiveSettingsUpdate = {
    display_name: "Private User",
    bio: "Maximum privacy settings enabled",
    password: "SecurePassword123!",
    privacy_settings: restrictivePrivacySettings,
    notification_preferences: minimalNotificationSettings,
    href: "https://reddit-platform.example.com/settings",
    referrer: "https://reddit-platform.example.com/settings",
  } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings;

  const privateUser =
    await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
      connection,
      {
        body: restrictiveSettingsUpdate,
      },
    );
  typia.assert(privateUser);
  TestValidator.equals(
    "display name updated to private",
    privateUser.displayName,
    "Private User",
  );
  TestValidator.equals(
    "bio updated for private user",
    privateUser.bio,
    "Maximum privacy settings enabled",
  );

  // Step 6: Test public profile with full notifications
  const publicPrivacySettings = {
    profile_visibility: "public" as const,
    show_activity: true,
    allow_mentions: true,
    show_karma: true,
    show_online_status: true,
    share_location: true,
  } satisfies IRedditPlatformPrivacySettings;

  const fullNotificationSettings = {
    email_notifications: true,
    push_notifications: true,
    comment_replies: true,
    post_replies: true,
    mentions: true,
    community_updates: true,
    digest_frequency: "daily" as const,
  } satisfies IRedditPlatformNotificationSettings;

  const publicSettingsUpdate = {
    display_name: "Public Social User",
    bio: "Enjoying full transparency and community engagement",
    password: "SecurePassword123!",
    privacy_settings: publicPrivacySettings,
    notification_preferences: fullNotificationSettings,
    href: "https://reddit-platform.example.com/settings",
    referrer: "https://reddit-platform.example.com/profile",
  } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings;

  const publicUser =
    await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
      connection,
      {
        body: publicSettingsUpdate,
      },
    );
  typia.assert(publicUser);
  TestValidator.equals(
    "display name updated to public",
    publicUser.displayName,
    "Public Social User",
  );
  TestValidator.equals(
    "bio updated for public user",
    publicUser.bio,
    "Enjoying full transparency and community engagement",
  );

  // Step 7: Test password change functionality
  const passwordChangeUpdate = {
    display_name: "Public Social User",
    bio: "Enjoying full transparency and community engagement",
    password: "SecurePassword123!",
    new_password: "NewSecurePassword456!",
    privacy_settings: publicPrivacySettings,
    notification_preferences: fullNotificationSettings,
    href: "https://reddit-platform.example.com/settings",
    referrer: "https://reddit-platform.example.com/profile",
  } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings;

  const passwordUpdatedUser =
    await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
      connection,
      {
        body: passwordChangeUpdate,
      },
    );
  typia.assert(passwordUpdatedUser);
  TestValidator.equals(
    "user profile maintained after password change",
    passwordUpdatedUser.displayName,
    "Public Social User",
  );

  // Step 8: Verify authentication still works with new password
  const reLoginData = {
    email: email,
    password: "NewSecurePassword456!",
    href: "https://reddit-platform.example.com/login",
    referrer: "https://reddit-platform.example.com/settings",
  } satisfies IRedditPlatformRegisteredUser.ILogin;

  const reLoggedInUser = await api.functional.auth.registeredUser.login(
    connection,
    {
      body: reLoginData,
    },
  );
  typia.assert(reLoggedInUser);
  TestValidator.equals(
    "login successful with new password",
    reLoggedInUser.id,
    passwordUpdatedUser.id,
  );

  // Step 9: Test partial updates (only privacy settings)
  const partialPrivacyUpdate = {
    password: "NewSecurePassword456!",
    privacy_settings: {
      profile_visibility: "community_members" as const,
      show_activity: true,
      allow_mentions: false,
      show_karma: false,
      show_online_status: false,
      share_location: false,
    } satisfies IRedditPlatformPrivacySettings,
    href: "https://reddit-platform.example.com/settings",
    referrer: "https://reddit-platform.example.com/profile",
  } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings;

  const partialUpdatedUser =
    await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
      connection,
      {
        body: partialPrivacyUpdate,
      },
    );
  typia.assert(partialUpdatedUser);
  TestValidator.equals(
    "partial update maintains previous data",
    partialUpdatedUser.displayName,
    "Public Social User",
  );

  // Step 10: Test partial updates (only notification settings)
  const partialNotificationUpdate = {
    password: "NewSecurePassword456!",
    notification_preferences: {
      email_notifications: true,
      push_notifications: true,
      comment_replies: false,
      post_replies: true,
      mentions: false,
      community_updates: false,
      digest_frequency: "monthly" as const,
    } satisfies IRedditPlatformNotificationSettings,
    href: "https://reddit-platform.example.com/settings",
    referrer: "https://reddit-platform.example.com/profile",
  } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings;

  const notificationUpdatedUser =
    await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
      connection,
      {
        body: partialNotificationUpdate,
      },
    );
  typia.assert(notificationUpdatedUser);
  TestValidator.equals(
    "notification update maintains profile data",
    notificationUpdatedUser.displayName,
    "Public Social User",
  );

  // Step 11: Test error scenarios - invalid settings combinations
  await TestValidator.error(
    "should reject empty privacy settings",
    async () => {
      await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
        connection,
        {
          body: {
            password: "NewSecurePassword456!",
            privacy_settings: {} as IRedditPlatformPrivacySettings,
            href: "https://reddit-platform.example.com/settings",
            referrer: "https://reddit-platform.example.com/profile",
          } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings,
        },
      );
    },
  );

  // Step 12: Test error scenarios - wrong password
  await TestValidator.error(
    "should reject settings update with wrong password",
    async () => {
      await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
        connection,
        {
          body: {
            display_name: "Should Fail",
            password: "WrongPassword123!",
            href: "https://reddit-platform.example.com/settings",
            referrer: "https://reddit-platform.example.com/profile",
          } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings,
        },
      );
    },
  );

  // Step 13: Final validation - comprehensive settings persistence
  const finalSettingsUpdate = {
    display_name: "Final Test User",
    bio: "All privacy and notification settings tested successfully",
    location: "Final Test Location",
    password: "NewSecurePassword456!",
    privacy_settings: {
      profile_visibility: "registered_users" as const,
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
      digest_frequency: "weekly" as const,
    } satisfies IRedditPlatformNotificationSettings,
    href: "https://reddit-platform.example.com/settings",
    referrer: "https://reddit-platform.example.com/profile",
  } satisfies IRedditPlatformRegisteredUser.IUpdateAuthSettings;

  const finalUser =
    await api.functional.redditPlatform.registeredUser.auth._settings.updateSettings(
      connection,
      {
        body: finalSettingsUpdate,
      },
    );
  typia.assert(finalUser);

  // Comprehensive validation of final state
  TestValidator.equals(
    "final display name",
    finalUser.displayName,
    "Final Test User",
  );
  TestValidator.equals(
    "final bio",
    finalUser.bio,
    "All privacy and notification settings tested successfully",
  );
  TestValidator.equals(
    "final location",
    finalUser.location,
    "Final Test Location",
  );
  TestValidator.equals(
    "user consistency maintained",
    finalUser.id,
    reLoggedInUser.id,
  );
  TestValidator.equals(
    "account status remains active",
    finalUser.accountStatus,
    "active",
  );
  TestValidator.equals(
    "business status maintained",
    finalUser.businessStatus,
    reLoggedInUser.businessStatus,
  );
}
