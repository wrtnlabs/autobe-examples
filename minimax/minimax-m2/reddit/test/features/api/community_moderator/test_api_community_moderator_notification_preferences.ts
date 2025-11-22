import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformAuthSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAuthSettings";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformNotificationSettings";
import type { IRedditPlatformPasswordRequirements } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPasswordRequirements";
import type { IRedditPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPrivacySettings";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformSecuritySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSecuritySettings";

/**
 * Test notification settings configuration for community moderators responsible
 * for community management.
 *
 * Create a community moderator with notification preferences optimized for
 * moderation activities including immediate alerts for content reports,
 * community activity updates, moderation action confirmations, and platform
 * announcements. Retrieve settings and validate that moderator notification
 * preferences support effective community oversight while preventing
 * notification fatigue.
 */
export async function test_api_community_moderator_notification_preferences(
  connection: api.IConnection,
) {
  // Step 1: Create a community moderator account for testing moderation-optimized notification settings
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const registeredUserId: string = typia.random<string & tags.Format<"uuid">>();

  const moderatorData = {
    registered_user_id: registeredUserId,
    moderation_permissions: JSON.stringify({
      can_remove_posts: true,
      can_remove_comments: true,
      can_ban_users: true,
      can_warn_users: true,
      can_pin_posts: true,
      can_edit_rules: true,
      can_manage_moderators: true,
      can_approve_posts: true,
    }),
    assigned_communities: JSON.stringify([
      "community-123",
      "community-456",
      "community-789",
    ]),
    appointed_by: "system_admin",
    moderation_count: 0,
    last_moderation_action: new Date().toISOString(),
    active_status: "active",
    appointed_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://reddit-platform.test/auth/communityModerator/join",
    referrer: "https://reddit-platform.test/moderation/dashboard",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  const moderatorResponse: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderatorResponse);

  // Step 2: Retrieve authenticated moderator's notification settings and security configuration
  const authSettings: IRedditPlatformAuthSettings =
    await api.functional.redditPlatform.communityModerator.auth.settings(
      connection,
    );
  typia.assert(authSettings);

  // Step 3: Validate that notification settings are optimized for moderation activities
  TestValidator.equals(
    "moderator user profile exists in settings",
    authSettings.user !== undefined && authSettings.user !== null,
    true,
  );

  // Validate notification settings structure exists
  TestValidator.equals(
    "notification settings are present",
    authSettings.notification_settings !== undefined &&
      authSettings.notification_settings !== null,
    true,
  );

  const notificationSettings = authSettings.notification_settings;

  // Validate key notification preferences for moderators
  TestValidator.equals(
    "comment reply notifications enabled for moderation responsiveness",
    notificationSettings.comment_replies,
    true,
  );

  TestValidator.equals(
    "post reply notifications enabled for community engagement",
    notificationSettings.post_replies,
    true,
  );

  TestValidator.equals(
    "mention notifications enabled for direct communication",
    notificationSettings.mentions,
    true,
  );

  TestValidator.equals(
    "community updates enabled for oversight activities",
    notificationSettings.community_updates,
    true,
  );

  // Validate email notifications for important moderation activities
  TestValidator.equals(
    "email notifications enabled for moderation alerts",
    notificationSettings.email_notifications,
    true,
  );

  // Validate push notifications for immediate content reports
  TestValidator.equals(
    "push notifications enabled for real-time alerts",
    notificationSettings.push_notifications,
    true,
  );

  // Validate digest frequency doesn't overwhelm moderator
  TestValidator.predicate(
    "digest frequency is reasonable (not never)",
    notificationSettings.digest_frequency === "daily" ||
      notificationSettings.digest_frequency === "weekly" ||
      notificationSettings.digest_frequency === "monthly",
  );

  // Step 4: Validate security settings for moderator account protection
  TestValidator.equals(
    "security settings are present",
    authSettings.security_settings !== undefined &&
      authSettings.security_settings !== null,
    true,
  );

  const securitySettings = authSettings.security_settings;

  // Validate two-factor authentication for enhanced security
  TestValidator.predicate(
    "two-factor authentication is enabled for moderator account security",
    securitySettings.two_factor_enabled === true,
  );

  // Validate session timeout for moderation sessions
  TestValidator.predicate(
    "session timeout is appropriate for active moderation",
    securitySettings.session_timeout >= 30 &&
      securitySettings.session_timeout <= 240,
  );

  // Validate login alerts for security monitoring
  TestValidator.equals(
    "login alerts enabled for security monitoring",
    securitySettings.login_alerts,
    true,
  );

  // Step 5: Validate privacy settings balance visibility and privacy
  TestValidator.equals(
    "privacy settings are present",
    authSettings.privacy_settings !== undefined &&
      authSettings.privacy_settings !== null,
    true,
  );

  const privacySettings = authSettings.privacy_settings;

  // Validate profile visibility for community recognition
  TestValidator.predicate(
    "profile visibility allows community interaction",
    privacySettings.profile_visibility === "public" ||
      privacySettings.profile_visibility === "registered_users" ||
      privacySettings.profile_visibility === "community_members",
  );

  // Validate activity sharing for transparency
  TestValidator.equals(
    "activity sharing enabled for transparency",
    privacySettings.show_activity,
    true,
  );

  // Validate mentions allowed for communication
  TestValidator.equals(
    "mentions allowed for community interaction",
    privacySettings.allow_mentions,
    true,
  );

  // Step 6: Final validation - ensure settings support effective moderation
  TestValidator.equals(
    "moderator profile has appropriate identification",
    authSettings.user.username !== undefined &&
      authSettings.user.username.length > 0,
    true,
  );

  TestValidator.equals(
    "moderator account is active for community management",
    authSettings.user.accountStatus === "active",
    true,
  );

  TestValidator.equals(
    "moderator profile includes karma for reputation tracking",
    authSettings.user.karmaScore >= 0,
    true,
  );
}
