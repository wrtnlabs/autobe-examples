import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Test successful platform administrator registration with super_admin level,
 * high security clearance, and comprehensive system permissions. Validates
 * complete privilege assignment, JWT token generation, and administrative
 * profile creation. Covers the primary workflow for appointing new super
 * administrators with full platform control.
 */
export async function test_api_platform_administrator_registration_super_admin(
  connection: api.IConnection,
) {
  // Generate realistic super admin credentials
  const username = `superadmin_${RandomGenerator.alphabets(8)}`;
  const email = typia.random<string & tags.Format<"email">>();
  const displayName = `Super Administrator ${RandomGenerator.name(2)}`;
  const password = "SuperSecureAdmin123!";

  // Create comprehensive system permissions JSON for super admin with full platform control
  const systemPermissions = JSON.stringify({
    user_management: {
      can_create_users: true,
      can_modify_users: true,
      can_suspend_users: true,
      can_ban_users: true,
      can_view_user_data: true,
      can_manage_user_permissions: true,
    },
    community_oversight: {
      can_create_communities: true,
      can_modify_communities: true,
      can_suspend_communities: true,
      can_delete_communities: true,
      can_moderate_all_communities: true,
      can_view_community_data: true,
    },
    content_moderation: {
      can_remove_content: true,
      can_moderate_globally: true,
      can_manage_reports: true,
      can_shadowban_content: true,
      can_restore_content: true,
      can_view_hidden_content: true,
    },
    system_configuration: {
      can_manage_settings: true,
      can_manage_features: true,
      can_manage_integrations: true,
      can_view_system_logs: true,
      can_manage_security: true,
      can_manage_backup: true,
    },
    compliance_legal: {
      can_access_compliance_data: true,
      can_manage_privacy: true,
      can_manage_data_retention: true,
      can_handle_dmca: true,
      can_manage_legal_requests: true,
      can_view_analytics: true,
    },
  });

  // Execute super admin registration
  const adminAccount: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username,
        email,
        password,
        display_name: displayName,
        administrator_level: "super_admin",
        system_permissions: systemPermissions,
        security_clearance: "top_secret",
        managed_communities: undefined,
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });

  // Validate the complete administrative response
  typia.assert(adminAccount);

  // Verify administrator level assignment
  TestValidator.equals(
    "administrator level should be super_admin",
    adminAccount.administrator_level,
    "super_admin",
  );

  // Verify security clearance level
  TestValidator.equals(
    "security clearance should be top_secret",
    adminAccount.security_clearance,
    "top_secret",
  );

  // Verify initial administrative actions count
  TestValidator.equals(
    "initial administrative actions should be zero",
    adminAccount.administrative_actions,
    0,
  );

  // Verify access level
  TestValidator.equals(
    "access level should be global for super admin",
    adminAccount.access_level,
    "global",
  );

  // Verify active status
  TestValidator.equals(
    "administrator status should be active",
    adminAccount.active_status,
    "active",
  );

  // Verify user profile association
  TestValidator.equals(
    "user ID should be properly set",
    adminAccount.user.id,
    adminAccount.registered_user.id,
  );

  // Verify JWT token generation
  TestValidator.predicate(
    "access token should be generated",
    adminAccount.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be generated",
    adminAccount.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "access token should have expiration",
    adminAccount.token.expired_at.length > 0,
  );

  // Verify system permissions structure
  TestValidator.predicate(
    "user management permissions should exist",
    adminAccount.system_permissions.user_management !== undefined,
  );

  TestValidator.predicate(
    "community oversight permissions should exist",
    adminAccount.system_permissions.community_oversight !== undefined,
  );

  TestValidator.predicate(
    "content moderation permissions should exist",
    adminAccount.system_permissions.content_moderation !== undefined,
  );

  TestValidator.predicate(
    "system configuration permissions should exist",
    adminAccount.system_permissions.system_configuration !== undefined,
  );

  TestValidator.predicate(
    "compliance legal permissions should exist",
    adminAccount.system_permissions.compliance_legal !== undefined,
  );

  // Verify timing information
  TestValidator.predicate(
    "appointed timestamp should be set",
    adminAccount.appointed_at.length > 0,
  );

  TestValidator.predicate(
    "created timestamp should be set",
    adminAccount.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated timestamp should be set",
    adminAccount.updated_at.length > 0,
  );

  // Verify username in user profile
  TestValidator.equals(
    "username should match registration input",
    adminAccount.user.username,
    username,
  );

  // Verify display name in user profile
  TestValidator.equals(
    "display name should match registration input",
    adminAccount.user.display_name,
    displayName,
  );

  // Verify email in user profile
  TestValidator.equals(
    "email should match registration input",
    adminAccount.user.email,
    email,
  );

  // Verify registered user profile matches user profile
  TestValidator.equals(
    "registered user ID should match user ID",
    adminAccount.registered_user.id,
    adminAccount.user.id,
  );

  TestValidator.equals(
    "registered user username should match user username",
    adminAccount.registered_user.username,
    adminAccount.user.username,
  );

  TestValidator.equals(
    "registered user display name should match user display name",
    adminAccount.registered_user.display_name,
    adminAccount.user.display_name,
  );

  // Verify that the registered user has proper account status
  TestValidator.predicate(
    "registered user should have valid account status",
    ["active", "suspended", "banned"].includes(
      adminAccount.registered_user.account_status,
    ),
  );

  // Verify registered user has proper verification status
  TestValidator.predicate(
    "registered user should have email verification status",
    typeof adminAccount.registered_user.email_verified === "boolean",
  );

  // Verify registered user has karma score
  TestValidator.predicate(
    "registered user should have karma score",
    adminAccount.registered_user.karma_score >= 0,
  );

  // Verify registered user has account creation timestamp
  TestValidator.predicate(
    "registered user should have creation timestamp",
    adminAccount.registered_user.account_created.length > 0,
  );

  // Verify that the administrator has appointed authority information
  TestValidator.predicate(
    "appointed by should be set",
    adminAccount.appointed_by.length > 0,
  );

  // Verify that the administrator has recent action tracking
  TestValidator.predicate(
    "last administrative action should be set",
    adminAccount.last_administrative_action.length > 0,
  );
}
