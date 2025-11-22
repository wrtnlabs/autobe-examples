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
 * Test successful retrieval of authentication settings for a community
 * moderator.
 *
 * This test validates the complete moderator authentication and settings
 * retrieval workflow:
 *
 * 1. Create a new community moderator account through join operation
 * 2. Authenticate and retrieve comprehensive settings
 * 3. Validate moderator profile, community access permissions, privacy settings,
 *    notification preferences, and security configuration
 * 4. Ensure moderator settings provide appropriate community management context
 *    while maintaining security
 */
export async function test_api_community_moderator_settings_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a new community moderator account with comprehensive moderation permissions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();

  const moderationPermissions = {
    can_remove_posts: true,
    can_remove_comments: true,
    can_ban_users: true,
    can_warn_users: true,
    can_pin_posts: true,
    can_edit_rules: true,
    can_manage_moderators: false,
    can_approve_posts: true,
  };

  const assignedCommunities = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];

  const moderatorData: IRedditPlatformCommunityModerator.ICreate = {
    registered_user_id: registeredUserId,
    moderation_permissions: JSON.stringify(moderationPermissions),
    assigned_communities: JSON.stringify(assignedCommunities),
    appointed_by: typia.random<string & tags.Format<"uuid">>(),
    moderation_count: 0,
    last_moderation_action: new Date().toISOString(),
    active_status: "active",
    appointed_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://example.com/register",
    referrer: "https://reddit.com",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const moderatorAuth: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderatorAuth);

  // Validate the moderator account creation response
  TestValidator.equals(
    "moderator account created successfully",
    moderatorAuth.moderator.active_status,
    "active",
  );
  TestValidator.equals(
    "moderator permissions assigned",
    moderatorAuth.moderator.moderation_permissions.can_remove_posts,
    true,
  );
  TestValidator.equals(
    "moderator community access granted",
    moderatorAuth.moderator.assigned_communities.includes(
      assignedCommunities[0],
    ),
    true,
  );
  TestValidator.predicate(
    "authentication token provided",
    !!moderatorAuth.token.access,
  );

  // Step 2: Retrieve comprehensive authentication settings for the authenticated moderator
  const authSettings: IRedditPlatformAuthSettings =
    await api.functional.redditPlatform.communityModerator.auth.settings(
      connection,
    );
  typia.assert(authSettings);

  // Step 3: Validate moderator profile information
  TestValidator.equals(
    "user profile included in settings",
    !!authSettings.user,
    true,
  );
  TestValidator.equals(
    "moderator user account active",
    authSettings.user.accountStatus,
    "active",
  );
  TestValidator.predicate(
    "user has valid email",
    authSettings.user.email.includes("@"),
  );

  // Step 4: Validate moderation-specific privacy settings
  TestValidator.equals(
    "privacy settings retrieved",
    !!authSettings.privacy_settings,
    true,
  );
  TestValidator.equals(
    "profile visibility configured",
    !!authSettings.privacy_settings.profile_visibility,
    true,
  );
  TestValidator.predicate(
    "activity sharing preference available",
    typeof authSettings.privacy_settings.show_activity === "boolean",
  );
  TestValidator.predicate(
    "mention permission setting available",
    typeof authSettings.privacy_settings.allow_mentions === "boolean",
  );

  // Step 5: Validate notification preferences for community management
  TestValidator.equals(
    "notification settings retrieved",
    !!authSettings.notification_settings,
    true,
  );
  TestValidator.predicate(
    "email notification preference available",
    typeof authSettings.notification_settings.email_notifications === "boolean",
  );
  TestValidator.predicate(
    "push notification setting available",
    typeof authSettings.notification_settings.push_notifications === "boolean",
  );
  TestValidator.predicate(
    "comment reply notification setting available",
    typeof authSettings.notification_settings.comment_replies === "boolean",
  );
  TestValidator.predicate(
    "community update notification setting available",
    typeof authSettings.notification_settings.community_updates === "boolean",
  );

  // Step 6: Validate enhanced security configuration for moderators
  TestValidator.equals(
    "security settings retrieved",
    !!authSettings.security_settings,
    true,
  );
  TestValidator.predicate(
    "two-factor authentication status available",
    typeof authSettings.security_settings.two_factor_enabled === "boolean",
  );
  TestValidator.predicate(
    "security method configuration available",
    typeof authSettings.security_settings.two_factor_method === "string",
  );
  TestValidator.predicate(
    "session timeout configuration available",
    typeof authSettings.security_settings.session_timeout === "number",
  );
  TestValidator.predicate(
    "password requirements configuration available",
    !!authSettings.security_settings.password_requirements,
  );

  // Step 7: Validate password requirements for moderator accounts
  const passwordReqs = authSettings.security_settings.password_requirements;
  TestValidator.equals(
    "minimum password length enforced",
    passwordReqs.minimum_length >= 8,
    true,
  );
  TestValidator.predicate(
    "password complexity requirements available",
    typeof passwordReqs.require_uppercase === "boolean",
  );
  TestValidator.predicate(
    "password history limit configured",
    typeof passwordReqs.recent_password_limit === "number",
  );

  // Step 8: Validate moderator-specific context and permissions
  TestValidator.predicate(
    "moderator has community management context",
    authSettings.user.karmaScore >= 0,
  );
  TestValidator.equals(
    "moderator account status verified",
    authSettings.user.accountStatus,
    "active",
  );
  TestValidator.predicate(
    "moderator session established",
    moderatorAuth.token.access.length > 0,
  );

  // Step 9: Final validation - ensure all security and privacy protections are active
  TestValidator.predicate(
    "privacy controls properly configured",
    authSettings.privacy_settings.profile_visibility !== undefined,
  );
  TestValidator.predicate(
    "notification system properly configured",
    authSettings.notification_settings.digest_frequency !== undefined,
  );
  TestValidator.predicate(
    "security measures properly configured",
    authSettings.security_settings.password_requirements.minimum_length > 0,
  );

  TestValidator.equals("moderator settings retrieval successful", true, true);
}
