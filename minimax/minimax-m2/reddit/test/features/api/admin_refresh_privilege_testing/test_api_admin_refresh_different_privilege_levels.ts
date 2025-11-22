import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_admin_refresh_different_privilege_levels(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrators with different privilege levels
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const moderatorAdminEmail = typia.random<string & tags.Format<"email">>();

  // Create super_admin with comprehensive system permissions
  const superAdmin = await api.functional.auth.platformAdministrator.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_"),
        email: superAdminEmail,
        password: "SuperAdmin123!",
        display_name: RandomGenerator.name(),
        administrator_level: "super_admin",
        system_permissions: JSON.stringify({
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
        }),
        security_clearance: "top_secret",
        managed_communities: JSON.stringify([]),
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    },
  );
  typia.assert(superAdmin);

  // Create admin with moderate system permissions
  const admin = await api.functional.auth.platformAdministrator.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_"),
        email: adminEmail,
        password: "Admin123!",
        display_name: RandomGenerator.name(),
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          user_management: {
            can_create_users: true,
            can_modify_users: true,
            can_suspend_users: false,
            can_ban_users: false,
            can_view_user_data: true,
            can_manage_user_permissions: false,
          },
          community_oversight: {
            can_create_communities: false,
            can_modify_communities: true,
            can_suspend_communities: false,
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
            can_view_system_logs: true,
            can_manage_security: false,
            can_manage_backup: false,
          },
          compliance_legal: {
            can_access_compliance_data: true,
            can_manage_privacy: false,
            can_manage_data_retention: false,
            can_handle_dmca: true,
            can_manage_legal_requests: false,
            can_view_analytics: true,
          },
        }),
        security_clearance: "high",
        managed_communities: JSON.stringify([]),
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    },
  );
  typia.assert(admin);

  // Create moderator_admin with limited system permissions
  const moderatorAdmin = await api.functional.auth.platformAdministrator.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_"),
        email: moderatorAdminEmail,
        password: "Moderator123!",
        display_name: RandomGenerator.name(),
        administrator_level: "moderator_admin",
        system_permissions: JSON.stringify({
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
            can_modify_communities: false,
            can_suspend_communities: false,
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
            can_view_hidden_content: false,
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
        }),
        security_clearance: "medium",
        managed_communities: JSON.stringify([]),
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    },
  );
  typia.assert(moderatorAdmin);

  // Step 2: Store original privileges for comparison
  const originalSuperAdminPrivileges = {
    level: superAdmin.administrator_level,
    permissions: superAdmin.system_permissions,
    security_clearance: superAdmin.security_clearance,
    access_level: superAdmin.access_level,
    managed_communities: superAdmin.managed_communities,
    appointed_by: superAdmin.appointed_by,
  };

  const originalAdminPrivileges = {
    level: admin.administrator_level,
    permissions: admin.system_permissions,
    security_clearance: admin.security_clearance,
    access_level: admin.access_level,
    managed_communities: admin.managed_communities,
    appointed_by: admin.appointed_by,
  };

  const originalModeratorAdminPrivileges = {
    level: moderatorAdmin.administrator_level,
    permissions: moderatorAdmin.system_permissions,
    security_clearance: moderatorAdmin.security_clearance,
    access_level: moderatorAdmin.access_level,
    managed_communities: moderatorAdmin.managed_communities,
    appointed_by: moderatorAdmin.appointed_by,
  };

  // Step 3: Test token refresh for super_admin
  const refreshedSuperAdmin =
    await api.functional.auth.platformAdministrator.refresh(connection, {
      body: {
        refresh_token: superAdmin.token.refresh,
        ip: "192.168.1.100",
        href: "https://admin.platform.com/dashboard",
        referrer: "https://admin.platform.com/login",
      } satisfies IRedditPlatformPlatformAdministrator.IRefresh,
    });
  typia.assert(refreshedSuperAdmin);

  // Step 4: Test token refresh for admin
  const refreshedAdmin =
    await api.functional.auth.platformAdministrator.refresh(connection, {
      body: {
        refresh_token: admin.token.refresh,
        ip: "192.168.1.101",
        href: "https://admin.platform.com/users",
        referrer: "https://admin.platform.com/login",
      } satisfies IRedditPlatformPlatformAdministrator.IRefresh,
    });
  typia.assert(refreshedAdmin);

  // Step 5: Test token refresh for moderator_admin
  const refreshedModeratorAdmin =
    await api.functional.auth.platformAdministrator.refresh(connection, {
      body: {
        refresh_token: moderatorAdmin.token.refresh,
        ip: "192.168.1.102",
        href: "https://admin.platform.com/moderation",
        referrer: "https://admin.platform.com/login",
      } satisfies IRedditPlatformPlatformAdministrator.IRefresh,
    });
  typia.assert(refreshedModeratorAdmin);

  // Step 6: Validate super_admin privileges are preserved after refresh
  TestValidator.equals(
    "super_admin privilege level maintained after refresh",
    refreshedSuperAdmin.administrator_level,
    originalSuperAdminPrivileges.level,
  );

  TestValidator.equals(
    "super_admin system permissions preserved after refresh",
    refreshedSuperAdmin.system_permissions,
    originalSuperAdminPrivileges.permissions,
  );

  TestValidator.equals(
    "super_admin security clearance maintained after refresh",
    refreshedSuperAdmin.security_clearance,
    originalSuperAdminPrivileges.security_clearance,
  );

  TestValidator.equals(
    "super_admin access level preserved after refresh",
    refreshedSuperAdmin.access_level,
    originalSuperAdminPrivileges.access_level,
  );

  TestValidator.equals(
    "super_admin managed communities maintained after refresh",
    refreshedSuperAdmin.managed_communities,
    originalSuperAdminPrivileges.managed_communities,
  );

  TestValidator.equals(
    "super_admin appointment authority preserved after refresh",
    refreshedSuperAdmin.appointed_by,
    originalSuperAdminPrivileges.appointed_by,
  );

  // Step 7: Validate admin privileges are preserved after refresh
  TestValidator.equals(
    "admin privilege level maintained after refresh",
    refreshedAdmin.administrator_level,
    originalAdminPrivileges.level,
  );

  TestValidator.equals(
    "admin system permissions preserved after refresh",
    refreshedAdmin.system_permissions,
    originalAdminPrivileges.permissions,
  );

  TestValidator.equals(
    "admin security clearance maintained after refresh",
    refreshedAdmin.security_clearance,
    originalAdminPrivileges.security_clearance,
  );

  TestValidator.equals(
    "admin access level preserved after refresh",
    refreshedAdmin.access_level,
    originalAdminPrivileges.access_level,
  );

  TestValidator.equals(
    "admin managed communities maintained after refresh",
    refreshedAdmin.managed_communities,
    originalAdminPrivileges.managed_communities,
  );

  TestValidator.equals(
    "admin appointment authority preserved after refresh",
    refreshedAdmin.appointed_by,
    originalAdminPrivileges.appointed_by,
  );

  // Step 8: Validate moderator_admin privileges are preserved after refresh
  TestValidator.equals(
    "moderator_admin privilege level maintained after refresh",
    refreshedModeratorAdmin.administrator_level,
    originalModeratorAdminPrivileges.level,
  );

  TestValidator.equals(
    "moderator_admin system permissions preserved after refresh",
    refreshedModeratorAdmin.system_permissions,
    originalModeratorAdminPrivileges.permissions,
  );

  TestValidator.equals(
    "moderator_admin security clearance maintained after refresh",
    refreshedModeratorAdmin.security_clearance,
    originalModeratorAdminPrivileges.security_clearance,
  );

  TestValidator.equals(
    "moderator_admin access level preserved after refresh",
    refreshedModeratorAdmin.access_level,
    originalModeratorAdminPrivileges.access_level,
  );

  TestValidator.equals(
    "moderator_admin managed communities maintained after refresh",
    refreshedModeratorAdmin.managed_communities,
    originalModeratorAdminPrivileges.managed_communities,
  );

  TestValidator.equals(
    "moderator_admin appointment authority preserved after refresh",
    refreshedModeratorAdmin.appointed_by,
    originalModeratorAdminPrivileges.appointed_by,
  );

  // Step 9: Verify that privilege hierarchy is maintained (super_admin > admin > moderator_admin)
  TestValidator.predicate(
    "super_admin has higher security clearance than admin",
    ["top_secret", "high", "medium", "low"].indexOf(
      refreshedSuperAdmin.security_clearance,
    ) <
      ["top_secret", "high", "medium", "low"].indexOf(
        refreshedAdmin.security_clearance,
      ),
  );

  TestValidator.predicate(
    "admin has higher security clearance than moderator_admin",
    ["top_secret", "high", "medium", "low"].indexOf(
      refreshedAdmin.security_clearance,
    ) <
      ["top_secret", "high", "medium", "low"].indexOf(
        refreshedModeratorAdmin.security_clearance,
      ),
  );

  // Step 10: Verify that new access tokens are generated but privileges remain intact
  TestValidator.notEquals(
    "super_admin access token is different after refresh",
    refreshedSuperAdmin.token.access,
    superAdmin.token.access,
  );

  TestValidator.notEquals(
    "admin access token is different after refresh",
    refreshedAdmin.token.access,
    admin.token.access,
  );

  TestValidator.notEquals(
    "moderator_admin access token is different after refresh",
    refreshedModeratorAdmin.token.access,
    moderatorAdmin.token.access,
  );

  TestValidator.equals(
    "super_admin user ID remains consistent after refresh",
    refreshedSuperAdmin.id,
    superAdmin.id,
  );

  TestValidator.equals(
    "admin user ID remains consistent after refresh",
    refreshedAdmin.id,
    admin.id,
  );

  TestValidator.equals(
    "moderator_admin user ID remains consistent after refresh",
    refreshedModeratorAdmin.id,
    moderatorAdmin.id,
  );
}
