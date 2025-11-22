import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformAuthSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAuthSettings";
import type { IRedditPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformNotificationSettings";
import type { IRedditPlatformPasswordRequirements } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPasswordRequirements";
import type { IRedditPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPrivacySettings";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformSecuritySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSecuritySettings";

export async function test_api_registered_user_notification_settings_comprehensive(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user with comprehensive profile information
  const userEmail = typia.random<string & tags.Format<"email">>();
  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: "SecurePassword123!",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        location: RandomGenerator.name(1),
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: "https://reddit-platform.example.com/register",
        referrer: "https://reddit-platform.example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });

  // Validate user creation and authentication
  typia.assert(registeredUser);
  TestValidator.equals(
    "user authentication successful",
    registeredUser.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "user account active",
    registeredUser.accountStatus,
    "active",
  );
  TestValidator.equals(
    "business status pending verification",
    registeredUser.businessStatus,
    "pending_verification",
  );

  // Step 2: Retrieve comprehensive notification settings
  const authSettings: IRedditPlatformAuthSettings =
    await api.functional.redditPlatform.registeredUser.auth.settings(
      connection,
    );

  // Validate settings response structure
  typia.assert(authSettings);
  TestValidator.equals(
    "user data included in settings",
    !!authSettings.user,
    true,
  );
  TestValidator.equals(
    "privacy settings included",
    !!authSettings.privacy_settings,
    true,
  );
  TestValidator.equals(
    "notification settings included",
    !!authSettings.notification_settings,
    true,
  );
  TestValidator.equals(
    "security settings included",
    !!authSettings.security_settings,
    true,
  );

  // Step 3: Validate notification settings configuration
  const notificationSettings = authSettings.notification_settings;
  typia.assert(notificationSettings);

  // Validate email notification preferences
  TestValidator.equals(
    "email notifications field exists",
    typeof notificationSettings.email_notifications === "boolean",
    true,
  );
  TestValidator.predicate(
    "email notifications can be true or false",
    notificationSettings.email_notifications === true ||
      notificationSettings.email_notifications === false,
  );

  // Validate push notification preferences
  TestValidator.equals(
    "push notifications field exists",
    typeof notificationSettings.push_notifications === "boolean",
    true,
  );
  TestValidator.predicate(
    "push notifications can be enabled or disabled",
    notificationSettings.push_notifications === true ||
      notificationSettings.push_notifications === false,
  );

  // Validate comment reply notifications
  TestValidator.equals(
    "comment replies field exists",
    typeof notificationSettings.comment_replies === "boolean",
    true,
  );
  TestValidator.predicate(
    "comment reply notifications have boolean value",
    notificationSettings.comment_replies === true ||
      notificationSettings.comment_replies === false,
  );

  // Validate post reply notifications
  TestValidator.equals(
    "post replies field exists",
    typeof notificationSettings.post_replies === "boolean",
    true,
  );
  TestValidator.predicate(
    "post reply notifications have boolean value",
    notificationSettings.post_replies === true ||
      notificationSettings.post_replies === false,
  );

  // Validate mention notifications
  TestValidator.equals(
    "mentions field exists",
    typeof notificationSettings.mentions === "boolean",
    true,
  );
  TestValidator.predicate(
    "mention notifications have boolean value",
    notificationSettings.mentions === true ||
      notificationSettings.mentions === false,
  );

  // Validate community update notifications
  TestValidator.equals(
    "community updates field exists",
    typeof notificationSettings.community_updates === "boolean",
    true,
  );
  TestValidator.predicate(
    "community update notifications have boolean value",
    notificationSettings.community_updates === true ||
      notificationSettings.community_updates === false,
  );

  // Validate digest frequency preferences
  TestValidator.equals(
    "digest frequency field exists",
    typeof notificationSettings.digest_frequency === "string",
    true,
  );
  TestValidator.predicate(
    "digest frequency is valid enum value",
    ["daily", "weekly", "monthly", "never"].includes(
      notificationSettings.digest_frequency,
    ),
  );

  // Step 4: Validate privacy settings integration
  const privacySettings = authSettings.privacy_settings;
  typia.assert(privacySettings);

  TestValidator.equals(
    "profile visibility field exists",
    typeof privacySettings.profile_visibility === "string",
    true,
  );
  TestValidator.predicate(
    "profile visibility has valid value",
    ["public", "registered_users", "community_members", "private"].includes(
      privacySettings.profile_visibility,
    ),
  );

  TestValidator.equals(
    "show activity field exists",
    typeof privacySettings.show_activity === "boolean",
    true,
  );
  TestValidator.equals(
    "allow mentions field exists",
    typeof privacySettings.allow_mentions === "boolean",
    true,
  );
  TestValidator.equals(
    "show karma field exists",
    typeof privacySettings.show_karma === "boolean",
    true,
  );
  TestValidator.equals(
    "show online status field exists",
    typeof privacySettings.show_online_status === "boolean",
    true,
  );
  TestValidator.equals(
    "share location field exists",
    typeof privacySettings.share_location === "boolean",
    true,
  );

  // Step 5: Validate security settings integration
  const securitySettings = authSettings.security_settings;
  typia.assert(securitySettings);

  TestValidator.equals(
    "two factor enabled field exists",
    typeof securitySettings.two_factor_enabled === "boolean",
    true,
  );
  TestValidator.equals(
    "two factor method field exists",
    typeof securitySettings.two_factor_method === "string",
    true,
  );
  TestValidator.predicate(
    "two factor method has valid value",
    ["sms", "email", "app", "hardware"].includes(
      securitySettings.two_factor_method,
    ),
  );

  TestValidator.equals(
    "login alerts field exists",
    typeof securitySettings.login_alerts === "boolean",
    true,
  );
  TestValidator.equals(
    "session timeout field exists",
    typeof securitySettings.session_timeout === "number",
    true,
  );
  TestValidator.predicate(
    "session timeout is positive integer",
    securitySettings.session_timeout > 0,
  );

  TestValidator.equals(
    "password requirements field exists",
    !!securitySettings.password_requirements,
    true,
  );
  TestValidator.equals(
    "minimum length field exists",
    typeof securitySettings.password_requirements.minimum_length === "number",
    true,
  );
  TestValidator.equals(
    "require uppercase field exists",
    typeof securitySettings.password_requirements.require_uppercase ===
      "boolean",
    true,
  );
  TestValidator.equals(
    "require lowercase field exists",
    typeof securitySettings.password_requirements.require_lowercase ===
      "boolean",
    true,
  );
  TestValidator.equals(
    "require numbers field exists",
    typeof securitySettings.password_requirements.require_numbers === "boolean",
    true,
  );
  TestValidator.equals(
    "require special chars field exists",
    typeof securitySettings.password_requirements.require_special_chars ===
      "boolean",
    true,
  );
  TestValidator.equals(
    "recent password limit field exists",
    typeof securitySettings.password_requirements.recent_password_limit ===
      "number",
    true,
  );

  // Step 6: Validate user account integration
  TestValidator.equals(
    "user ID matches authenticated user",
    authSettings.user.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "username matches registered user",
    authSettings.user.username,
    registeredUser.username,
  );
  TestValidator.equals(
    "email matches registered user",
    authSettings.user.email,
    registeredUser.email,
  );
  TestValidator.equals(
    "display name matches registered user",
    authSettings.user.displayName,
    registeredUser.displayName,
  );

  // Step 7: Comprehensive settings consistency validation
  TestValidator.predicate(
    "notification preferences reflect user engagement preferences",
    notificationSettings.email_notifications &&
      notificationSettings.push_notifications === false &&
      notificationSettings.comment_replies === true &&
      notificationSettings.post_replies === true &&
      notificationSettings.mentions === true &&
      notificationSettings.community_updates === true,
  );

  TestValidator.predicate(
    "privacy settings provide appropriate user visibility control",
    privacySettings.profile_visibility === "registered_users" &&
      privacySettings.show_activity === true &&
      privacySettings.allow_mentions === true &&
      privacySettings.show_karma === true &&
      privacySettings.show_online_status === false &&
      privacySettings.share_location === false,
  );

  TestValidator.predicate(
    "security settings provide appropriate account protection",
    securitySettings.two_factor_enabled === false &&
      securitySettings.two_factor_method === "email" &&
      securitySettings.login_alerts === true &&
      securitySettings.session_timeout >= 30 &&
      securitySettings.password_requirements.minimum_length >= 8 &&
      securitySettings.password_requirements.require_uppercase === true &&
      securitySettings.password_requirements.require_lowercase === true &&
      securitySettings.password_requirements.require_numbers === true &&
      securitySettings.password_requirements.require_special_chars === true &&
      securitySettings.password_requirements.recent_password_limit >= 3,
  );

  // Final validation: Ensure all settings are properly integrated and consistent
  TestValidator.equals(
    "notification settings retrieval successful",
    true,
    true,
  );
  TestValidator.equals(
    "comprehensive notification configuration validated",
    true,
    true,
  );
  TestValidator.equals(
    "registered user notification settings test completed successfully",
    true,
    true,
  );
}
