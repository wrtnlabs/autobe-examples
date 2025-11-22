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
 * Test successful retrieval of authentication settings for a registered user.
 *
 * This test validates the complete workflow of creating a registered user
 * account and retrieving their comprehensive authentication settings. The test
 * ensures that:
 *
 * - New user accounts can be created successfully with complete profile
 *   information
 * - Authentication settings endpoint returns comprehensive user preferences
 * - All settings sections are properly populated (profile, privacy,
 *   notifications, security)
 * - Sensitive authentication details are appropriately protected
 * - Settings reflect the user's current authentication and security status
 */
export async function test_api_registered_user_settings_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a new registered user account with complete profile information
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string & tags.MinLength<3> & tags.MaxLength<20> =
    RandomGenerator.alphaNumeric(12);
  const displayName: string & tags.MaxLength<50> = RandomGenerator.name(2);
  const bio: string & tags.MaxLength<500> = RandomGenerator.paragraph({
    sentences: 3,
  });
  const location: string & tags.MaxLength<100> = RandomGenerator.name(1);
  const websiteUrl: string & tags.Format<"uri"> =
    `https://example.com/${username}`;
  const avatarUrl: string & tags.Format<"uri"> =
    `https://avatar.example.com/${username}.png`;

  const createdUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username,
        email: userEmail,
        password: "TestPassword123!",
        display_name: displayName,
        bio,
        location,
        website_url: websiteUrl,
        avatar_url: avatarUrl,
        href: "https://test.example.com/register",
        referrer: "https://test.example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(createdUser);

  // Step 2: Retrieve comprehensive authentication settings
  const authSettings: IRedditPlatformAuthSettings =
    await api.functional.redditPlatform.registeredUser.auth.settings(
      connection,
    );
  typia.assert(authSettings);

  // Step 3: Validate user profile information in settings
  const userProfile = authSettings.user;
  TestValidator.equals(
    "user profile should match created user",
    userProfile.id,
    createdUser.id,
  );
  TestValidator.equals(
    "username should match created user",
    userProfile.username,
    createdUser.username,
  );
  TestValidator.equals(
    "email should match created user",
    userProfile.email,
    createdUser.email,
  );
  TestValidator.equals(
    "display name should match created user",
    userProfile.displayName,
    createdUser.displayName,
  );
  TestValidator.equals(
    "bio should match created user",
    userProfile.bio,
    createdUser.bio,
  );
  TestValidator.equals(
    "location should match created user",
    userProfile.location,
    createdUser.location,
  );
  TestValidator.equals(
    "website URL should match created user",
    userProfile.websiteUrl,
    createdUser.websiteUrl,
  );
  TestValidator.equals(
    "avatar URL should match created user",
    userProfile.avatarUrl,
    createdUser.avatarUrl,
  );

  // Validate account status and verification
  TestValidator.equals(
    "account status should be active",
    userProfile.accountStatus,
    "active",
  );
  TestValidator.predicate(
    "email verified should be boolean",
    typeof userProfile.emailVerified === "boolean",
  );
  TestValidator.predicate(
    "two factor enabled should be boolean",
    typeof userProfile.twoFactorEnabled === "boolean",
  );

  // Validate authentication timestamps and counters
  TestValidator.predicate(
    "karma score should be non-negative number",
    userProfile.karmaScore >= 0,
  );
  TestValidator.predicate(
    "login count should be non-negative number",
    userProfile.loginCount >= 0,
  );
  TestValidator.predicate(
    "failed login attempts should be non-negative number",
    userProfile.failedLoginAttempts >= 0,
  );
  TestValidator.predicate(
    "last login should be valid date-time",
    typeof userProfile.lastLogin === "string",
  );
  TestValidator.predicate(
    "account created should be valid date-time",
    typeof userProfile.accountCreated === "string",
  );

  // Step 4: Validate privacy settings structure and values
  const privacySettings = authSettings.privacy_settings;
  TestValidator.predicate(
    "profile visibility should be valid enum",
    ["public", "registered_users", "community_members", "private"].includes(
      privacySettings.profile_visibility,
    ),
  );
  TestValidator.predicate(
    "show activity should be boolean",
    typeof privacySettings.show_activity === "boolean",
  );
  TestValidator.predicate(
    "allow mentions should be boolean",
    typeof privacySettings.allow_mentions === "boolean",
  );
  TestValidator.predicate(
    "show karma should be boolean",
    typeof privacySettings.show_karma === "boolean",
  );
  TestValidator.predicate(
    "show online status should be boolean",
    typeof privacySettings.show_online_status === "boolean",
  );
  TestValidator.predicate(
    "share location should be boolean",
    typeof privacySettings.share_location === "boolean",
  );

  // Step 5: Validate notification settings structure and values
  const notificationSettings = authSettings.notification_settings;
  TestValidator.predicate(
    "email notifications should be boolean",
    typeof notificationSettings.email_notifications === "boolean",
  );
  TestValidator.predicate(
    "push notifications should be boolean",
    typeof notificationSettings.push_notifications === "boolean",
  );
  TestValidator.predicate(
    "comment replies should be boolean",
    typeof notificationSettings.comment_replies === "boolean",
  );
  TestValidator.predicate(
    "post replies should be boolean",
    typeof notificationSettings.post_replies === "boolean",
  );
  TestValidator.predicate(
    "mentions should be boolean",
    typeof notificationSettings.mentions === "boolean",
  );
  TestValidator.predicate(
    "community updates should be boolean",
    typeof notificationSettings.community_updates === "boolean",
  );
  TestValidator.predicate(
    "digest frequency should be valid enum",
    ["daily", "weekly", "monthly", "never"].includes(
      notificationSettings.digest_frequency,
    ),
  );

  // Step 6: Validate security settings structure and values
  const securitySettings = authSettings.security_settings;
  TestValidator.predicate(
    "two factor enabled should be boolean",
    typeof securitySettings.two_factor_enabled === "boolean",
  );
  TestValidator.predicate(
    "two factor method should be valid enum",
    ["sms", "email", "app", "hardware"].includes(
      securitySettings.two_factor_method,
    ),
  );
  TestValidator.predicate(
    "login alerts should be boolean",
    typeof securitySettings.login_alerts === "boolean",
  );
  TestValidator.predicate(
    "session timeout should be positive number",
    securitySettings.session_timeout > 0,
  );

  // Validate password requirements
  const passwordReqs = securitySettings.password_requirements;
  TestValidator.predicate(
    "minimum password length should be between 8-128",
    passwordReqs.minimum_length >= 8 && passwordReqs.minimum_length <= 128,
  );
  TestValidator.predicate(
    "require uppercase should be boolean",
    typeof passwordReqs.require_uppercase === "boolean",
  );
  TestValidator.predicate(
    "require lowercase should be boolean",
    typeof passwordReqs.require_lowercase === "boolean",
  );
  TestValidator.predicate(
    "require numbers should be boolean",
    typeof passwordReqs.require_numbers === "boolean",
  );
  TestValidator.predicate(
    "require special chars should be boolean",
    typeof passwordReqs.require_special_chars === "boolean",
  );
  TestValidator.predicate(
    "recent password limit should be positive number",
    passwordReqs.recent_password_limit > 0,
  );

  // Validate optional fields
  if (
    securitySettings.account_recovery_email !== null &&
    securitySettings.account_recovery_email !== undefined
  ) {
    TestValidator.predicate(
      "account recovery email should be valid email format",
      typeof securitySettings.account_recovery_email === "string" &&
        securitySettings.account_recovery_email.includes("@"),
    );
  }

  if (
    passwordReqs.max_age_days !== null &&
    passwordReqs.max_age_days !== undefined
  ) {
    TestValidator.predicate(
      "max age days should be positive number",
      passwordReqs.max_age_days > 0,
    );
  }

  // Step 7: Validate that sensitive authentication details are not exposed
  // Password hash should not be included in settings response
  TestValidator.predicate(
    "user should not contain password hash in settings",
    !("passwordHash" in userProfile) && !("password_hash" in userProfile),
  );

  // Token information should not be included in settings response
  TestValidator.predicate(
    "settings should not contain authentication tokens",
    !("token" in authSettings) &&
      !("access" in authSettings) &&
      !("refresh" in authSettings),
  );

  // Step 8: Validate business workflow status
  TestValidator.equals(
    "business status should be pending verification initially",
    userProfile.businessStatus,
    "pending_verification",
  );

  // Final validation: Ensure all required sections are present
  TestValidator.predicate(
    "settings should contain user profile",
    authSettings.user !== undefined,
  );
  TestValidator.predicate(
    "settings should contain privacy settings",
    authSettings.privacy_settings !== undefined,
  );
  TestValidator.predicate(
    "settings should contain notification settings",
    authSettings.notification_settings !== undefined,
  );
  TestValidator.predicate(
    "settings should contain security settings",
    authSettings.security_settings !== undefined,
  );
}
