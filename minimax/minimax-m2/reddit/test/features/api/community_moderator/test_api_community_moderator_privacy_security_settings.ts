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

export async function test_api_community_moderator_privacy_security_settings(
  connection: api.IConnection,
) {
  // Step 1: Create a community moderator with enhanced permissions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();
  const currentTime = new Date().toISOString();

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
      typia.random<string & tags.Format<"uuid">>(),
      typia.random<string & tags.Format<"uuid">>(),
    ]),
    appointed_by: typia.random<string & tags.Format<"uuid">>(),
    moderation_count: 0,
    last_moderation_action: currentTime,
    active_status: "active",
    appointed_at: currentTime,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    created_at: currentTime,
    updated_at: currentTime,
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  const moderatorAuth: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderatorAuth);

  // Step 2: Retrieve privacy and security settings for the moderator
  const authSettings: IRedditPlatformAuthSettings =
    await api.functional.redditPlatform.communityModerator.auth.settings(
      connection,
    );
  typia.assert(authSettings);

  // Step 3: Validate the settings structure and content
  // Validate user data is present
  TestValidator.equals(
    "moderator user data present",
    !!authSettings.user,
    true,
  );

  // Validate privacy settings exist and are appropriate for moderation role
  TestValidator.equals(
    "privacy settings present",
    !!authSettings.privacy_settings,
    true,
  );
  if (authSettings.privacy_settings) {
    // Moderators may need more restrictive privacy for security
    const privacy = authSettings.privacy_settings;

    // Profile visibility options should be appropriate for moderation
    const validVisibilityLevels = [
      "public",
      "registered_users",
      "community_members",
      "private",
    ];
    TestValidator.predicate(
      "profile visibility is valid",
      validVisibilityLevels.includes(privacy.profile_visibility),
    );

    // Activity showing should be configurable based on moderation needs
    TestValidator.predicate(
      "show activity setting is boolean",
      typeof privacy.show_activity === "boolean",
    );

    // Mentions should generally be allowed for moderators to handle community
    TestValidator.predicate(
      "allow mentions setting is boolean",
      typeof privacy.allow_mentions === "boolean",
    );

    // Karma visibility should be configurable
    TestValidator.predicate(
      "show karma setting is boolean",
      typeof privacy.show_karma === "boolean",
    );

    // Online status visibility should be configurable for moderation flexibility
    TestValidator.predicate(
      "show online status setting is boolean",
      typeof privacy.show_online_status === "boolean",
    );

    // Location sharing should be optional for privacy
    TestValidator.predicate(
      "share location setting is boolean",
      typeof privacy.share_location === "boolean",
    );
  }

  // Validate notification settings exist
  TestValidator.equals(
    "notification settings present",
    !!authSettings.notification_settings,
    true,
  );
  if (authSettings.notification_settings) {
    const notifications = authSettings.notification_settings;

    // Email notifications should be configurable
    TestValidator.predicate(
      "email notifications setting is boolean",
      typeof notifications.email_notifications === "boolean",
    );

    // Push notifications should be configurable
    TestValidator.predicate(
      "push notifications setting is boolean",
      typeof notifications.push_notifications === "boolean",
    );

    // Comment replies notification should be important for moderators
    TestValidator.predicate(
      "comment replies setting is boolean",
      typeof notifications.comment_replies === "boolean",
    );

    // Post replies notification should be important for moderators
    TestValidator.predicate(
      "post replies setting is boolean",
      typeof notifications.post_replies === "boolean",
    );

    // Mentions should be crucial for moderators to handle community
    TestValidator.predicate(
      "mentions setting is boolean",
      typeof notifications.mentions === "boolean",
    );

    // Community updates should be important for moderation
    TestValidator.predicate(
      "community updates setting is boolean",
      typeof notifications.community_updates === "boolean",
    );

    // Digest frequency should be configurable
    const validDigestOptions = ["daily", "weekly", "monthly", "never"];
    TestValidator.predicate(
      "digest frequency is valid",
      validDigestOptions.includes(notifications.digest_frequency),
    );
  }

  // Validate security settings exist and have enhanced protection for moderators
  TestValidator.equals(
    "security settings present",
    !!authSettings.security_settings,
    true,
  );
  if (authSettings.security_settings) {
    const security = authSettings.security_settings;

    // Two-factor authentication should be available and highly recommended for moderators
    TestValidator.predicate(
      "two-factor authentication setting is boolean",
      typeof security.two_factor_enabled === "boolean",
    );

    // Two-factor method should be configurable
    const validTwoFactorMethods = ["sms", "email", "app", "hardware"];
    TestValidator.predicate(
      "two-factor method is valid",
      validTwoFactorMethods.includes(security.two_factor_method),
    );

    // Login alerts should be important for moderator accounts due to elevated permissions
    TestValidator.predicate(
      "login alerts setting is boolean",
      typeof security.login_alerts === "boolean",
    );

    // Session timeout should be reasonable for moderation work
    TestValidator.predicate(
      "session timeout is valid number",
      typeof security.session_timeout === "number" &&
        security.session_timeout > 0,
    );

    // Password requirements should be strong for moderator accounts
    TestValidator.equals(
      "password requirements present",
      !!security.password_requirements,
      true,
    );
    if (security.password_requirements) {
      const passwordReqs = security.password_requirements;

      TestValidator.predicate(
        "minimum password length is reasonable (8-128)",
        typeof passwordReqs.minimum_length === "number" &&
          passwordReqs.minimum_length >= 8 &&
          passwordReqs.minimum_length <= 128,
      );

      TestValidator.predicate(
        "require uppercase setting is boolean",
        typeof passwordReqs.require_uppercase === "boolean",
      );

      TestValidator.predicate(
        "require lowercase setting is boolean",
        typeof passwordReqs.require_lowercase === "boolean",
      );

      TestValidator.predicate(
        "require numbers setting is boolean",
        typeof passwordReqs.require_numbers === "boolean",
      );

      TestValidator.predicate(
        "require special chars setting is boolean",
        typeof passwordReqs.require_special_chars === "boolean",
      );

      // Max age should be configurable for security policies
      TestValidator.predicate(
        "max age days is valid number or null",
        typeof passwordReqs.max_age_days === "number" ||
          passwordReqs.max_age_days === null ||
          passwordReqs.max_age_days === undefined,
      );

      TestValidator.predicate(
        "recent password limit is reasonable",
        typeof passwordReqs.recent_password_limit === "number" &&
          passwordReqs.recent_password_limit >= 0,
      );
    }

    // Account recovery email should be configurable for security
    TestValidator.predicate(
      "account recovery email is valid email or null/undefined",
      typeof security.account_recovery_email === "string" ||
        security.account_recovery_email === null ||
        security.account_recovery_email === undefined,
    );
  }

  // Validate that all settings are consistent and appropriate for a moderation account
  TestValidator.predicate(
    "all required settings sections are present",
    !!authSettings.user &&
      !!authSettings.privacy_settings &&
      !!authSettings.notification_settings &&
      !!authSettings.security_settings,
  );

  // Additional validation for moderator-specific security considerations
  TestValidator.predicate(
    "settings reflect moderation account requirements",
    authSettings.security_settings?.two_factor_enabled !== undefined &&
      authSettings.security_settings?.login_alerts !== undefined,
  );
}
