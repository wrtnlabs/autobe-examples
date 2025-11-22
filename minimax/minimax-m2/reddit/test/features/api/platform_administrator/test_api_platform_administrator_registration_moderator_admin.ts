import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_platform_administrator_registration_moderator_admin(
  connection: api.IConnection,
) {
  // Step 1: Generate realistic test data for moderator_admin registration
  const username = `${RandomGenerator.alphaNumeric(8)}_mod_admin`;
  const email = `mod.admin.${RandomGenerator.alphaNumeric(6)}@platform.internal`;
  const displayName = `Moderator Admin ${RandomGenerator.name(1)}`;

  // Step 2: Create community-focused system permissions structure
  const systemPermissions = JSON.stringify({
    user_management: {
      can_create_users: false,
      can_modify_users: false,
      can_suspend_users: false,
      can_ban_users: false,
      can_view_user_data: true,
      can_manage_user_permissions: false,
    },
    community_oversight: {
      can_create_communities: false,
      can_modify_communities: true,
      can_suspend_communities: true,
      can_delete_communities: false,
      can_moderate_all_communities: false,
      can_view_community_data: true,
    },
    content_moderation: {
      can_remove_content: true,
      can_moderate_globally: false,
      can_manage_reports: true,
      can_shadowban_content: false,
      can_restore_content: false,
      can_view_hidden_content: true,
    },
    system_configuration: {
      can_manage_settings: false,
      can_manage_features: false,
      can_manage_integrations: false,
      can_view_system_logs: false,
      can_manage_security: false,
      can_manage_backup: false,
    },
    compliance_legal: {
      can_access_compliance_data: false,
      can_manage_privacy: false,
      can_manage_data_retention: false,
      can_handle_dmca: false,
      can_manage_legal_requests: false,
      can_view_analytics: false,
    },
  });

  // Step 3: Execute platform administrator registration
  const moderatorAdmin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username,
        email,
        password: "SecureModerator123!",
        display_name: displayName,
        administrator_level: "moderator_admin",
        system_permissions: systemPermissions,
        security_clearance: "low",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });

  // Step 4: Validate registration response
  typia.assert(moderatorAdmin);

  // Step 5: Verify hierarchical privilege assignment
  TestValidator.equals(
    "administrator level should be moderator_admin",
    moderatorAdmin.administrator_level,
    "moderator_admin",
  );

  // Step 6: Validate security clearance level
  TestValidator.equals(
    "security clearance should be low",
    moderatorAdmin.security_clearance,
    "low",
  );

  // Step 7: Confirm system access scope is appropriate for moderator_admin
  TestValidator.equals(
    "access level should be community specific",
    moderatorAdmin.access_level,
    "community_specific",
  );

  // Step 8: Validate community oversight permissions
  TestValidator.predicate(
    "should have community modification permissions",
    moderatorAdmin.system_permissions.community_oversight
      ?.can_modify_communities === true,
  );

  TestValidator.predicate(
    "should have community suspension permissions",
    moderatorAdmin.system_permissions.community_oversight
      ?.can_suspend_communities === true,
  );

  TestValidator.predicate(
    "should NOT have community deletion permissions",
    moderatorAdmin.system_permissions.community_oversight
      ?.can_delete_communities === false,
  );

  // Step 9: Validate content moderation scope
  TestValidator.predicate(
    "should have content removal permissions",
    moderatorAdmin.system_permissions.content_moderation?.can_remove_content ===
      true,
  );

  TestValidator.predicate(
    "should have report management permissions",
    moderatorAdmin.system_permissions.content_moderation?.can_manage_reports ===
      true,
  );

  TestValidator.predicate(
    "should NOT have global moderation permissions",
    moderatorAdmin.system_permissions.content_moderation
      ?.can_moderate_globally === false,
  );

  // Step 10: Verify limited system configuration access
  TestValidator.predicate(
    "should NOT have system settings management permissions",
    moderatorAdmin.system_permissions.system_configuration
      ?.can_manage_settings === false,
  );

  TestValidator.predicate(
    "should NOT have security configuration permissions",
    moderatorAdmin.system_permissions.system_configuration
      ?.can_manage_security === false,
  );

  // Step 11: Validate authentication token structure
  TestValidator.predicate(
    "should have valid access token",
    moderatorAdmin.token?.access !== undefined &&
      moderatorAdmin.token.access.length > 0,
  );

  TestValidator.predicate(
    "should have valid refresh token",
    moderatorAdmin.token?.refresh !== undefined &&
      moderatorAdmin.token.refresh.length > 0,
  );

  // Step 12: Verify base registered user information
  TestValidator.equals(
    "registered user username should match input",
    moderatorAdmin.registered_user.username,
    username,
  );

  TestValidator.equals(
    "registered user display name should match input",
    moderatorAdmin.registered_user.display_name,
    displayName,
  );

  // Step 13: Confirm user summary information
  TestValidator.equals(
    "user summary ID should be valid UUID format",
    moderatorAdmin.user.id,
    moderatorAdmin.user.id,
  );

  TestValidator.equals(
    "user summary email should match input",
    moderatorAdmin.user.email,
    email,
  );

  // Step 14: Validate administrative status
  TestValidator.equals(
    "administrative status should be active",
    moderatorAdmin.active_status,
    "active",
  );

  // Step 15: Verify appointment information is present
  TestValidator.predicate(
    "should have appointed_by information",
    moderatorAdmin.appointed_by !== undefined &&
      moderatorAdmin.appointed_by.length > 0,
  );

  TestValidator.predicate(
    "should have appointment timestamp",
    moderatorAdmin.appointed_at !== undefined &&
      new Date(moderatorAdmin.appointed_at).getTime() > 0,
  );

  // Step 16: Confirm initial administrative actions count
  TestValidator.predicate(
    "initial administrative actions should be 0",
    moderatorAdmin.administrative_actions === 0,
  );

  // Step 17: Verify administrative capabilities are appropriately limited
  TestValidator.predicate(
    "should NOT have user creation permissions",
    moderatorAdmin.system_permissions.user_management?.can_create_users ===
      false,
  );

  TestValidator.predicate(
    "should NOT have user banning permissions",
    moderatorAdmin.system_permissions.user_management?.can_ban_users === false,
  );

  // Step 18: Validate compliance/legal access restrictions
  TestValidator.predicate(
    "should NOT have compliance data access",
    moderatorAdmin.system_permissions.compliance_legal
      ?.can_access_compliance_data === false,
  );

  TestValidator.predicate(
    "should NOT have legal request management permissions",
    moderatorAdmin.system_permissions.compliance_legal
      ?.can_manage_legal_requests === false,
  );

  // Step 19: Test community-specific access pattern
  TestValidator.predicate(
    "community data access should be enabled",
    moderatorAdmin.system_permissions.community_oversight
      ?.can_view_community_data === true,
  );

  // Step 20: Verify hierarchical privilege enforcement
  TestValidator.predicate(
    "should have appropriate access level for moderator_admin role",
    moderatorAdmin.access_level === "community_specific" ||
      moderatorAdmin.access_level === "regional",
  );
}
