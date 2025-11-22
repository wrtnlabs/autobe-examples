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

/**
 * Comprehensive security settings validation for registered users in a
 * Reddit-like platform.
 *
 * Test the complete security configuration workflow by creating a registered
 * user account and retrieving their detailed security settings. Validate that
 * the security settings include all critical components: two-factor
 * authentication status and method preferences, login monitoring and alert
 * settings, session timeout configurations, password policy requirements, and
 * account recovery email setup. Ensure proper integration between user
 * registration and security settings retrieval, validating that new users have
 * appropriate default security configurations while supporting custom security
 * preferences.
 */
export async function test_api_registered_user_security_settings_comprehensive(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user account with comprehensive profile information
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userData = {
    username: RandomGenerator.alphaNumeric(12),
    email: userEmail,
    password: "SecurePassword123!",
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    location: RandomGenerator.name(1),
    website_url: typia.random<string & tags.Format<"uri">>(),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };

  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userData satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Validate user account creation and initial security state
  TestValidator.equals(
    "user account created successfully",
    registeredUser.email,
    userEmail,
  );
  TestValidator.equals(
    "user has unique username",
    registeredUser.username,
    userData.username,
  );
  TestValidator.predicate(
    "user has initial security settings",
    registeredUser.twoFactorEnabled !== undefined,
  );
  TestValidator.predicate(
    "user account is active",
    registeredUser.accountStatus === "active",
  );
  TestValidator.predicate(
    "user has business status",
    registeredUser.businessStatus !== undefined,
  );

  // Step 3: Retrieve comprehensive security settings
  const authSettings: IRedditPlatformAuthSettings =
    await api.functional.redditPlatform.registeredUser.auth.settings(
      connection,
    );
  typia.assert(authSettings);

  // Step 4: Validate complete security settings structure
  TestValidator.predicate(
    "security settings contain user profile",
    authSettings.user !== undefined,
  );
  TestValidator.predicate(
    "security settings contain privacy configuration",
    authSettings.privacy_settings !== undefined,
  );
  TestValidator.predicate(
    "security settings contain notification preferences",
    authSettings.notification_settings !== undefined,
  );
  TestValidator.predicate(
    "security settings contain security configuration",
    authSettings.security_settings !== undefined,
  );

  // Step 5: Validate two-factor authentication configuration
  const securitySettings = authSettings.security_settings;
  TestValidator.predicate(
    "two-factor authentication setting exists",
    securitySettings.two_factor_enabled !== undefined,
  );
  TestValidator.equals(
    "two-factor authentication method preference",
    securitySettings.two_factor_method,
    "app",
  );

  // Step 6: Validate login monitoring and alert preferences
  TestValidator.predicate(
    "login alerts setting exists",
    securitySettings.login_alerts !== undefined,
  );
  TestValidator.equals(
    "login alerts enabled",
    securitySettings.login_alerts,
    true,
  );

  // Step 7: Validate session management configuration
  TestValidator.predicate(
    "session timeout setting exists",
    securitySettings.session_timeout !== undefined,
  );
  TestValidator.predicate(
    "session timeout is reasonable",
    securitySettings.session_timeout >= 15 &&
      securitySettings.session_timeout <= 1440,
  );

  // Step 8: Validate password policy requirements
  const passwordRequirements = securitySettings.password_requirements;
  TestValidator.predicate(
    "password requirements exist",
    passwordRequirements !== undefined,
  );
  TestValidator.predicate(
    "minimum password length is set",
    passwordRequirements.minimum_length >= 8,
  );
  TestValidator.predicate(
    "password requirements include uppercase",
    passwordRequirements.require_uppercase === true,
  );
  TestValidator.predicate(
    "password requirements include lowercase",
    passwordRequirements.require_lowercase === true,
  );
  TestValidator.predicate(
    "password requirements include numbers",
    passwordRequirements.require_numbers === true,
  );
  TestValidator.predicate(
    "password requirements include special chars",
    passwordRequirements.require_special_chars === true,
  );
  TestValidator.predicate(
    "recent password limit is configured",
    passwordRequirements.recent_password_limit >= 3,
  );

  // Step 9: Validate account recovery configuration
  TestValidator.predicate(
    "account recovery email can be configured",
    securitySettings.account_recovery_email === null ||
      securitySettings.account_recovery_email === undefined ||
      (typeof securitySettings.account_recovery_email === "string" &&
        securitySettings.account_recovery_email.length > 0),
  );

  // Step 10: Validate privacy settings configuration
  const privacySettings = authSettings.privacy_settings;
  TestValidator.predicate(
    "privacy settings have profile visibility",
    privacySettings.profile_visibility !== undefined,
  );
  TestValidator.equals(
    "profile visibility is configurable",
    privacySettings.profile_visibility,
    "public",
  );
  TestValidator.predicate(
    "activity sharing settings exist",
    privacySettings.show_activity !== undefined,
  );
  TestValidator.predicate(
    "mention permissions are configurable",
    privacySettings.allow_mentions !== undefined,
  );
  TestValidator.predicate(
    "karma display settings exist",
    privacySettings.show_karma !== undefined,
  );
  TestValidator.predicate(
    "online status visibility is configurable",
    privacySettings.show_online_status !== undefined,
  );

  // Step 11: Validate notification preferences
  const notificationSettings = authSettings.notification_settings;
  TestValidator.predicate(
    "email notifications setting exists",
    notificationSettings.email_notifications !== undefined,
  );
  TestValidator.equals(
    "email notifications enabled",
    notificationSettings.email_notifications,
    true,
  );
  TestValidator.predicate(
    "push notifications setting exists",
    notificationSettings.push_notifications !== undefined,
  );
  TestValidator.predicate(
    "comment reply notifications are configurable",
    notificationSettings.comment_replies !== undefined,
  );
  TestValidator.predicate(
    "post reply notifications are configurable",
    notificationSettings.post_replies !== undefined,
  );
  TestValidator.predicate(
    "mention notifications are configurable",
    notificationSettings.mentions !== undefined,
  );
  TestValidator.predicate(
    "community update notifications exist",
    notificationSettings.community_updates !== undefined,
  );
  TestValidator.predicate(
    "digest frequency is configurable",
    notificationSettings.digest_frequency !== undefined,
  );

  // Step 12: Validate user profile integration
  TestValidator.equals(
    "security settings user matches registered user",
    authSettings.user.id,
    registeredUser.id,
  );
  TestValidator.equals(
    "security settings email matches registered user",
    authSettings.user.email,
    registeredUser.email,
  );
  TestValidator.predicate(
    "security settings reflect user account status",
    authSettings.user.accountStatus === registeredUser.accountStatus,
  );

  // Step 13: Validate security settings completeness and consistency
  TestValidator.predicate(
    "all security configuration components are present",
    authSettings.security_settings.two_factor_enabled !== undefined &&
      authSettings.security_settings.session_timeout !== undefined &&
      authSettings.security_settings.password_requirements !== undefined,
  );
}
